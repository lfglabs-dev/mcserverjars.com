use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectResponse {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub source_url: Option<String>,
    pub category: String,
    pub display_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectDetailResponse {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub source_url: Option<String>,
    pub category: String,
    pub version_count: i64,
    pub build_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VersionResponse {
    pub version: String,
    pub version_type: String,
    pub release_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BuildResponse {
    pub build_number: Option<i32>,
    pub version_string: Option<String>,
    pub download_url: String,
    pub file_name: Option<String>,
    pub file_size: Option<i64>,
    pub sha256: Option<String>,
    pub stability: Option<String>,
    pub is_latest: Option<bool>,
    pub release_date: Option<DateTime<Utc>>,
}

