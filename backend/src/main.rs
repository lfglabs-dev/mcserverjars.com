use axum::{
    extract::{Path, Query, State},
    http::{Method, StatusCode},
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod buildtools;
mod error;
mod models;

use error::AppError;
use models::*;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
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

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("Connected to database");

    let state = AppState { pool };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        // API v1 routes
        .route("/v1/projects", get(list_projects))
        .route("/v1/projects/:slug", get(get_project))
        .route("/v1/projects/:slug/versions", get(list_project_versions))
        .route("/v1/projects/:slug/versions/:version", get(list_version_builds))
        .route("/v1/projects/:slug/versions/:version/latest", get(get_latest_build))
        .route("/v1/projects/:slug/versions/:version/builds/:build", get(get_build))
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

async fn list_projects(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ProjectResponse>>, AppError> {
    let projects = sqlx::query_as!(
        ProjectResponse,
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
    let project = sqlx::query_as!(
        ProjectDetailResponse,
        r#"
        SELECT
            p.id,
            p.slug,
            p.name,
            p.description,
            p.website_url,
            p.source_url,
            p.category,
            (SELECT COUNT(DISTINCT minecraft_version_id) FROM jar_builds WHERE project_id = p.id) as "version_count!",
            (SELECT COUNT(*) FROM jar_builds WHERE project_id = p.id) as "build_count!"
        FROM jar_projects p
        WHERE p.slug = $1 AND p.is_active = true
        "#,
        slug
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(project))
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

    let versions = sqlx::query_as!(
        VersionResponse,
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
        "#,
        slug,
        limit
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(versions))
}

async fn list_version_builds(
    State(state): State<Arc<AppState>>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<Vec<BuildResponse>>, AppError> {
    let builds = sqlx::query_as!(
        BuildResponse,
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
        "#,
        slug,
        version
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(builds))
}

async fn get_latest_build(
    State(state): State<Arc<AppState>>,
    Path((slug, version)): Path<(String, String)>,
) -> Result<Json<BuildResponse>, AppError> {
    let build = sqlx::query_as!(
        BuildResponse,
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
        "#,
        slug,
        version
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(build))
}

async fn get_build(
    State(state): State<Arc<AppState>>,
    Path((slug, version, build_num)): Path<(String, String, i32)>,
) -> Result<Json<BuildResponse>, AppError> {
    let build = sqlx::query_as!(
        BuildResponse,
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
        "#,
        slug,
        version,
        build_num
    )
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(build))
}

