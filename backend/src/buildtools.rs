//! BuildTools integration for building Spigot/CraftBukkit jars
//!
//! This module handles downloading and running BuildTools to generate
//! Spigot and CraftBukkit server jars for versions that require building.

use anyhow::{Context, Result};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use std::process::Command;
use tokio::fs;

const BUILDTOOLS_URL: &str = "https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar";

pub struct BuildToolsRunner {
    work_dir: PathBuf,
    java_path: String,
    supabase_url: String,
    supabase_service_key: String,
}

impl BuildToolsRunner {
    pub fn new(work_dir: PathBuf, supabase_url: String, supabase_service_key: String) -> Self {
        Self {
            work_dir,
            java_path: std::env::var("JAVA_PATH").unwrap_or_else(|_| "java".to_string()),
            supabase_url,
            supabase_service_key,
        }
    }

    /// Download BuildTools.jar if not already present or if it's too small (corrupted)
    pub async fn ensure_buildtools(&self) -> Result<PathBuf> {
        let buildtools_path = self.work_dir.join("BuildTools.jar");

        // Check if exists and is valid (should be at least 1MB)
        let needs_download = if buildtools_path.exists() {
            let metadata = fs::metadata(&buildtools_path).await?;
            metadata.len() < 1_000_000 // Less than 1MB means it's corrupted
        } else {
            true
        };

        if needs_download {
            tracing::info!("Downloading BuildTools...");
            
            let client = reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .build()?;
            
            let response = client.get(BUILDTOOLS_URL).send().await?;
            
            if !response.status().is_success() {
                anyhow::bail!("Failed to download BuildTools: {}", response.status());
            }
            
            let bytes = response.bytes().await?;
            
            if bytes.len() < 1_000_000 {
                anyhow::bail!("Downloaded BuildTools is too small ({} bytes), probably a Cloudflare challenge page", bytes.len());
            }
            
            fs::write(&buildtools_path, &bytes).await?;
            tracing::info!("BuildTools downloaded ({} bytes)", bytes.len());
        }

        Ok(buildtools_path)
    }

    /// Build a specific Minecraft version
    pub async fn build_version(&self, version: &str, output_type: BuildType) -> Result<BuildResult> {
        let buildtools_path = self.ensure_buildtools().await?;

        // Create version-specific work directory
        let version_dir = self.work_dir.join(format!("build-{}-{}", output_type.slug(), version));
        fs::create_dir_all(&version_dir).await?;

        // Copy BuildTools.jar to the version directory
        let local_buildtools = version_dir.join("BuildTools.jar");
        fs::copy(&buildtools_path, &local_buildtools).await?;

        let compile_arg = match output_type {
            BuildType::Spigot => "SPIGOT",
            BuildType::CraftBukkit => "CRAFTBUKKIT",
        };

        tracing::info!("Building {} for version {}...", output_type.name(), version);

        // Run BuildTools synchronously (it takes a while)
        let output = Command::new(&self.java_path)
            .current_dir(&version_dir)
            .args([
                "-jar",
                "BuildTools.jar",
                "--rev",
                version,
                "--compile",
                compile_arg,
            ])
            .output()
            .context("Failed to execute BuildTools")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            tracing::error!("BuildTools stdout: {}", stdout);
            tracing::error!("BuildTools stderr: {}", stderr);
            anyhow::bail!("BuildTools failed for {} {}: {}", output_type.name(), version, stderr);
        }

        tracing::info!("BuildTools completed for {} {}", output_type.name(), version);

        // Find the output jar
        let output_pattern = match output_type {
            BuildType::Spigot => format!("spigot-{}.jar", version),
            BuildType::CraftBukkit => format!("craftbukkit-{}.jar", version),
        };

        let jar_path = version_dir.join(&output_pattern);
        if !jar_path.exists() {
            // Try looking in the root work dir too
            let alt_path = self.work_dir.join(&output_pattern);
            if alt_path.exists() {
                return self.process_jar(&alt_path, &output_pattern).await;
            }
            anyhow::bail!("Expected output jar not found: {}", output_pattern);
        }

        self.process_jar(&jar_path, &output_pattern).await
    }

    async fn process_jar(&self, jar_path: &PathBuf, file_name: &str) -> Result<BuildResult> {
        // Read and calculate SHA256
        let contents = fs::read(jar_path).await?;
        let sha256 = calculate_sha256(&contents);
        let file_size = contents.len() as i64;

        tracing::info!("Built jar: {} ({} bytes, sha256: {})", file_name, file_size, &sha256[..16]);

        Ok(BuildResult {
            jar_path: jar_path.clone(),
            file_name: file_name.to_string(),
            file_size,
            sha256,
            contents,
        })
    }

    /// Save jar to local storage and return the download URL
    pub async fn upload_to_storage(&self, result: &BuildResult, storage_path: &str) -> Result<String> {
        // Store locally in /app/jars directory
        let local_path = PathBuf::from("/app/jars").join(storage_path);
        
        // Create parent directories
        if let Some(parent) = local_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        tracing::info!("Saving {} to local storage...", storage_path);
        
        fs::write(&local_path, &result.contents).await?;

        // Return the public URL (served via nginx)
        let public_url = format!(
            "https://api.mcserverjars.com/jars/{}",
            storage_path
        );

        tracing::info!("Saved to: {} ({} bytes)", public_url, result.contents.len());

        Ok(public_url)
    }

    /// Clean up build artifacts for a specific version
    pub async fn cleanup_version(&self, version: &str, build_type: BuildType) -> Result<()> {
        let version_dir = self.work_dir.join(format!("build-{}-{}", build_type.slug(), version));
        if version_dir.exists() {
            fs::remove_dir_all(&version_dir).await?;
            tracing::info!("Cleaned up build directory: {:?}", version_dir);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuildType {
    Spigot,
    CraftBukkit,
}

impl BuildType {
    pub fn name(&self) -> &'static str {
        match self {
            BuildType::Spigot => "Spigot",
            BuildType::CraftBukkit => "CraftBukkit",
        }
    }

    pub fn slug(&self) -> &'static str {
        match self {
            BuildType::Spigot => "spigot",
            BuildType::CraftBukkit => "craftbukkit",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "spigot" => Some(BuildType::Spigot),
            "craftbukkit" => Some(BuildType::CraftBukkit),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub struct BuildResult {
    pub jar_path: PathBuf,
    pub file_name: String,
    pub file_size: i64,
    pub sha256: String,
    pub contents: Vec<u8>,
}

fn calculate_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256() {
        let data = b"hello world";
        let hash = calculate_sha256(data);
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn test_build_type_from_str() {
        assert_eq!(BuildType::from_str("spigot"), Some(BuildType::Spigot));
        assert_eq!(BuildType::from_str("SPIGOT"), Some(BuildType::Spigot));
        assert_eq!(BuildType::from_str("craftbukkit"), Some(BuildType::CraftBukkit));
        assert_eq!(BuildType::from_str("invalid"), None);
    }
}
