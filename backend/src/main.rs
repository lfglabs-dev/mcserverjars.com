use axum::{
    body::Body,
    extract::{Path, Query, State},
    http::{header, Method, StatusCode},
    response::{IntoResponse, Json, Response},
    routing::{get, post},
    Router,
};
use tokio_util::io::ReaderStream;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool, FromRow};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use std::collections::HashSet;
use std::path::PathBuf;

mod buildtools;
mod error;
mod models;

use buildtools::{BuildToolsRunner, BuildType};
use error::AppError;
use models::*;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    supabase_url: String,
    supabase_service_key: String,
    work_dir: PathBuf,
    // Track builds in progress to prevent duplicates
    builds_in_progress: Arc<Mutex<HashSet<String>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let supabase_url = std::env::var("SUPABASE_URL")
        .unwrap_or_else(|_| "https://dmtwdyasmifhjsxmqslv.supabase.co".to_string());
    
    let supabase_service_key = std::env::var("SUPABASE_SERVICE_KEY")
        .unwrap_or_else(|_| std::env::var("SUPABASE_SERVICE_ROLE_KEY").unwrap_or_default());

    let work_dir = PathBuf::from(std::env::var("WORK_DIR").unwrap_or_else(|_| "/app/work".to_string()));

    // Ensure work directory exists
    tokio::fs::create_dir_all(&work_dir).await?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("Connected to database");

    let state = AppState {
        pool,
        supabase_url,
        supabase_service_key,
        work_dir,
        builds_in_progress: Arc::new(Mutex::new(HashSet::new())),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        // API v1 routes
        .route("/v1/projects", get(list_projects))
        .route("/v1/projects/{slug}", get(get_project))
        .route("/v1/projects/{slug}/versions", get(list_project_versions))
        .route("/v1/projects/{slug}/versions/{version}", get(list_version_builds))
        .route("/v1/projects/{slug}/versions/{version}/latest", get(get_latest_build))
        .route("/v1/projects/{slug}/versions/{version}/builds/{build}", get(get_build))
        // Build endpoint
        .route("/v1/build", post(trigger_build))
        .route("/v1/build/status", get(get_build_status))
        // NMS mappings
        .route("/v1/nms-mappings", get(list_nms_mappings))
        .route("/v1/nms-mappings/{version}", get(get_nms_mapping))
        // Jar downloads
        .route("/jars/{*path}", get(serve_jar))
        // Health check
        .route("/health", get(health_check))
        .layer(cors)
        .with_state(Arc::new(state));

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;

    tracing::info!("Starting server on port {}", port);
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

// === Jar Download ===

async fn serve_jar(
    Path(path): Path<String>,
) -> Result<Response, AppError> {
    let file_path = std::path::PathBuf::from("/app/jars").join(&path);
    
    // Security check: ensure path doesn't escape /app/jars
    let canonical = file_path.canonicalize()
        .map_err(|_| AppError::NotFound)?;
    
    if !canonical.starts_with("/app/jars") {
        return Err(AppError::NotFound);
    }

    let file = tokio::fs::File::open(&canonical)
        .await
        .map_err(|_| AppError::NotFound)?;

    let metadata = file.metadata()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    // Extract filename for Content-Disposition
    let filename = canonical.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download.jar");

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/java-archive")
        .header(header::CONTENT_LENGTH, metadata.len())
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", filename),
        )
        .body(body)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(response)
}

// === Build Endpoint ===

#[derive(Debug, Deserialize)]
struct BuildRequest {
    version: String,
    build_type: String, // "spigot" or "craftbukkit"
}

#[derive(Debug, Serialize)]
struct BuildStatusResponse {
    builds_in_progress: Vec<String>,
}

#[derive(Debug, Serialize)]
struct BuildTriggerResponse {
    status: String,
    message: String,
    build_key: Option<String>,
}

async fn get_build_status(
    State(state): State<Arc<AppState>>,
) -> Json<BuildStatusResponse> {
    let builds = state.builds_in_progress.lock().await;
    Json(BuildStatusResponse {
        builds_in_progress: builds.iter().cloned().collect(),
    })
}

async fn trigger_build(
    State(state): State<Arc<AppState>>,
    Json(request): Json<BuildRequest>,
) -> Result<(StatusCode, Json<BuildTriggerResponse>), AppError> {
    let build_type = BuildType::from_str(&request.build_type)
        .ok_or_else(|| AppError::BadRequest("Invalid build_type. Must be 'spigot' or 'craftbukkit'".to_string()))?;

    let build_key = format!("{}-{}", build_type.slug(), request.version);

    // Check if build is already in progress
    {
        let builds = state.builds_in_progress.lock().await;
        if builds.contains(&build_key) {
            return Ok((StatusCode::ACCEPTED, Json(BuildTriggerResponse {
                status: "in_progress".to_string(),
                message: format!("Build for {} {} is already in progress", build_type.name(), request.version),
                build_key: Some(build_key),
            })));
        }
        
        // Limit concurrent builds to 1 to prevent server overload
        if !builds.is_empty() {
            return Ok((StatusCode::SERVICE_UNAVAILABLE, Json(BuildTriggerResponse {
                status: "busy".to_string(),
                message: format!("Server is busy building another version. Try again later. Current: {:?}", builds.iter().next()),
                build_key: None,
            })));
        }
    }

    // Check if build already exists in database
    let project_slug = build_type.slug();
    let existing = check_build_exists(&state.pool, project_slug, &request.version).await?;
    if existing {
        return Ok((StatusCode::OK, Json(BuildTriggerResponse {
            status: "exists".to_string(),
            message: format!("Build for {} {} already exists", build_type.name(), request.version),
            build_key: Some(build_key),
        })));
    }

    // Mark build as in progress
    {
        let mut builds = state.builds_in_progress.lock().await;
        builds.insert(build_key.clone());
    }

    // Spawn the build task
    let state_clone = state.clone();
    let version = request.version.clone();
    let build_key_clone = build_key.clone();
    
    tokio::spawn(async move {
        let result = run_build(&state_clone, &version, build_type).await;
        
        // Remove from in-progress set
        {
            let mut builds = state_clone.builds_in_progress.lock().await;
            builds.remove(&build_key_clone);
        }

        match result {
            Ok(_) => tracing::info!("Build completed: {}", build_key_clone),
            Err(e) => tracing::error!("Build failed: {} - {}", build_key_clone, e),
        }
    });

    Ok((StatusCode::ACCEPTED, Json(BuildTriggerResponse {
        status: "started".to_string(),
        message: format!("Build started for {} {}", build_type.name(), request.version),
        build_key: Some(build_key),
    })))
}

async fn check_build_exists(pool: &PgPool, project_slug: &str, version: &str) -> Result<bool, AppError> {
    let result: Option<(i64,)> = sqlx::query_as(
        r#"
        SELECT COUNT(*) as count
        FROM jar_builds jb
        JOIN jar_projects p ON p.id = jb.project_id
        JOIN minecraft_versions mv ON mv.id = jb.minecraft_version_id
        WHERE p.slug = $1 AND mv.version = $2
        "#
    )
    .bind(project_slug)
    .bind(version)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|(count,)| count > 0).unwrap_or(false))
}

async fn run_build(state: &AppState, version: &str, build_type: BuildType) -> anyhow::Result<()> {
    let runner = BuildToolsRunner::new(
        state.work_dir.clone(),
        state.supabase_url.clone(),
        state.supabase_service_key.clone(),
    );

    // Build the jar
    let result = runner.build_version(version, build_type).await?;

    // Upload to storage
    let storage_path = format!("{}/{}/{}", build_type.slug(), version, result.file_name);
    let download_url = runner.upload_to_storage(&result, &storage_path).await?;

    // Get project ID
    let project: Option<(uuid::Uuid,)> = sqlx::query_as(
        "SELECT id FROM jar_projects WHERE slug = $1"
    )
    .bind(build_type.slug())
    .fetch_optional(&state.pool)
    .await?;

    let project_id = project
        .ok_or_else(|| anyhow::anyhow!("Project {} not found", build_type.slug()))?
        .0;

    // Get or create minecraft version
    let mc_version: Option<(uuid::Uuid,)> = sqlx::query_as(
        "SELECT id FROM minecraft_versions WHERE version = $1"
    )
    .bind(version)
    .fetch_optional(&state.pool)
    .await?;

    let mc_version_id = if let Some((id,)) = mc_version {
        id
    } else {
        // Create the version
        let new_version: (uuid::Uuid,) = sqlx::query_as(
            "INSERT INTO minecraft_versions (version, version_type) VALUES ($1, 'release') RETURNING id"
        )
        .bind(version)
        .fetch_one(&state.pool)
        .await?;
        new_version.0
    };

    // Insert the build record
    sqlx::query(
        r#"
        INSERT INTO jar_builds (
            project_id, minecraft_version_id, build_number,
            download_url, file_name, file_size, sha256,
            stability, is_latest_for_mc_version, release_date
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, 'stable', true, NOW())
        ON CONFLICT (project_id, minecraft_version_id, build_number) 
        DO UPDATE SET
            download_url = EXCLUDED.download_url,
            file_name = EXCLUDED.file_name,
            file_size = EXCLUDED.file_size,
            sha256 = EXCLUDED.sha256,
            release_date = NOW()
        "#
    )
    .bind(project_id)
    .bind(mc_version_id)
    .bind(&download_url)
    .bind(&result.file_name)
    .bind(result.file_size)
    .bind(&result.sha256)
    .execute(&state.pool)
    .await?;

    tracing::info!(
        "Created build record for {} {} - {}",
        build_type.name(),
        version,
        download_url
    );

    // If we extracted an NMS revision, store it in nms_version_mappings
    if let Some(ref nms_revision) = result.nms_revision {
        let craftbukkit_package = format!("org.bukkit.craftbukkit.{}", nms_revision);
        let spigot_version = format!("{}-R0.1-SNAPSHOT", version);
        
        sqlx::query(
            r#"
            INSERT INTO nms_version_mappings (
                minecraft_version, nms_revision, craftbukkit_package, spigot_version, is_latest_for_revision
            ) VALUES ($1, $2, $3, $4, false)
            ON CONFLICT (minecraft_version) DO UPDATE SET
                nms_revision = EXCLUDED.nms_revision,
                craftbukkit_package = EXCLUDED.craftbukkit_package,
                spigot_version = EXCLUDED.spigot_version,
                updated_at = NOW()
            "#
        )
        .bind(version)
        .bind(nms_revision)
        .bind(&craftbukkit_package)
        .bind(&spigot_version)
        .execute(&state.pool)
        .await?;
        
        tracing::info!("Stored NMS mapping: {} -> {}", version, nms_revision);
    }

    // Cleanup build directory
    runner.cleanup_version(version, build_type).await?;

    Ok(())
}

// === Existing Endpoints ===

async fn list_projects(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProjectResponse>>, AppError> {
    let projects: Vec<ProjectResponse> = sqlx::query_as(
        r#"
        SELECT
            id,
            slug,
            name,
            description,
            website_url,
            source_url,
            category,
            display_order
        FROM jar_projects
        WHERE is_active = true
        ORDER BY display_order ASC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(projects))
}

async fn get_project(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Json<ProjectDetailResponse>, AppError> {
    let project: Option<ProjectDetailResponse> = sqlx::query_as(
        r#"
        SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.website_url,
            p.source_url,
            p.category,
            (SELECT COUNT(DISTINCT minecraft_version_id) FROM jar_builds WHERE project_id = p.id) as version_count,
            (SELECT COUNT(*) FROM jar_builds WHERE project_id = p.id) as build_count
        FROM jar_projects p
        WHERE p.slug = $1 AND p.is_active = true
        "#
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?;

    project.ok_or(AppError::NotFound).map(Json)
}

#[derive(Deserialize)]
struct VersionQuery {
    limit: Option<i64>,
}

async fn list_project_versions(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
    Query(query): Query<VersionQuery>,
) -> Result<Json<Vec<VersionResponse>>, AppError> {
    let limit = query.limit.unwrap_or(50);

    let versions: Vec<VersionResponse> = sqlx::query_as(
        r#"
        SELECT DISTINCT
            mv.version,
            mv.version_type,
            mv.release_date
        FROM jar_builds jb
        JOIN jar_projects p ON p.id = jb.project_id
        JOIN minecraft_versions mv ON mv.id = jb.minecraft_version_id
        WHERE p.slug = $1 AND p.is_active = true
        ORDER BY mv.release_date DESC
        LIMIT $2
        "#
    )
    .bind(&slug)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(versions))
}

async fn list_version_builds(
    State(state): State<Arc<AppState>>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<Vec<BuildResponse>>, AppError> {
    let builds: Vec<BuildResponse> = sqlx::query_as(
        r#"
        SELECT
            jb.build_number,
            jb.version_string,
            jb.download_url,
            jb.file_name,
            jb.file_size,
            jb.sha256,
            jb.stability,
            jb.is_latest_for_mc_version as is_latest,
            jb.release_date
        FROM jar_builds jb
        JOIN jar_projects p ON p.id = jb.project_id
        JOIN minecraft_versions mv ON mv.id = jb.minecraft_version_id
        WHERE p.slug = $1 AND mv.version = $2 AND p.is_active = true
        ORDER BY jb.build_number DESC NULLS LAST, jb.release_date DESC
        "#
    )
    .bind(&slug)
    .bind(&version)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(builds))
}

async fn get_latest_build(
    State(state): State<Arc<AppState>>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<BuildResponse>, AppError> {
    let build: Option<BuildResponse> = sqlx::query_as(
        r#"
        SELECT
            jb.build_number,
            jb.version_string,
            jb.download_url,
            jb.file_name,
            jb.file_size,
            jb.sha256,
            jb.stability,
            jb.is_latest_for_mc_version as is_latest,
            jb.release_date
        FROM jar_builds jb
        JOIN jar_projects p ON p.id = jb.project_id
        JOIN minecraft_versions mv ON mv.id = jb.minecraft_version_id
        WHERE p.slug = $1 AND mv.version = $2 AND p.is_active = true AND jb.is_latest_for_mc_version = true
        LIMIT 1
        "#
    )
    .bind(&slug)
    .bind(&version)
    .fetch_optional(&state.pool)
    .await?;

    build.ok_or(AppError::NotFound).map(Json)
}

async fn get_build(
    State(state): State<Arc<AppState>>,
    Path((slug, version, build_num)): Path<(String, String, i32)>,
) -> Result<Json<BuildResponse>, AppError> {
    let build: Option<BuildResponse> = sqlx::query_as(
        r#"
        SELECT
            jb.build_number,
            jb.version_string,
            jb.download_url,
            jb.file_name,
            jb.file_size,
            jb.sha256,
            jb.stability,
            jb.is_latest_for_mc_version as is_latest,
            jb.release_date
        FROM jar_builds jb
        JOIN jar_projects p ON p.id = jb.project_id
        JOIN minecraft_versions mv ON mv.id = jb.minecraft_version_id
        WHERE p.slug = $1 AND mv.version = $2 AND jb.build_number = $3 AND p.is_active = true
        "#
    )
    .bind(&slug)
    .bind(&version)
    .bind(build_num)
    .fetch_optional(&state.pool)
    .await?;

    build.ok_or(AppError::NotFound).map(Json)
}

// === NMS Mappings ===

#[derive(Debug, Serialize, Deserialize, FromRow)]
struct NmsMappingResponse {
    minecraft_version: String,
    nms_revision: String,
    craftbukkit_package: String,
    spigot_version: Option<String>,
    is_latest_for_revision: bool,
}

#[derive(Debug, Serialize)]
struct NmsMappingsListResponse {
    mappings: Vec<NmsMappingResponse>,
    by_revision: std::collections::HashMap<String, Vec<String>>,
    by_version: std::collections::HashMap<String, String>,
}

async fn list_nms_mappings(
    State(state): State<Arc<AppState>>,
) -> Result<Json<NmsMappingsListResponse>, AppError> {
    let mappings: Vec<NmsMappingResponse> = sqlx::query_as(
        r#"
        SELECT 
            minecraft_version,
            nms_revision,
            craftbukkit_package,
            spigot_version,
            is_latest_for_revision
        FROM nms_version_mappings
        ORDER BY minecraft_version DESC
        "#
    )
    .fetch_all(&state.pool)
    .await?;

    // Build grouped views
    let mut by_revision: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    let mut by_version: std::collections::HashMap<String, String> = std::collections::HashMap::new();

    for mapping in &mappings {
        by_version.insert(mapping.minecraft_version.clone(), mapping.nms_revision.clone());
        by_revision
            .entry(mapping.nms_revision.clone())
            .or_default()
            .push(mapping.minecraft_version.clone());
    }

    Ok(Json(NmsMappingsListResponse {
        mappings,
        by_revision,
        by_version,
    }))
}

async fn get_nms_mapping(
    State(state): State<Arc<AppState>>,
    Path(version): Path<String>,
) -> Result<Json<NmsMappingResponse>, AppError> {
    let mapping: Option<NmsMappingResponse> = sqlx::query_as(
        r#"
        SELECT 
            minecraft_version,
            nms_revision,
            craftbukkit_package,
            spigot_version,
            is_latest_for_revision
        FROM nms_version_mappings
        WHERE minecraft_version = $1
        "#
    )
    .bind(&version)
    .fetch_optional(&state.pool)
    .await?;

    mapping.ok_or(AppError::NotFound).map(Json)
}
