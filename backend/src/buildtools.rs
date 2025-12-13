//! BuildTools integration for building Spigot/CraftBukkit jars
//!
//! This module handles downloading and running BuildTools to generate
//! Spigot and CraftBukkit server jars for versions that require building.

use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::process::Command;
use tokio::fs;

const BUILDTOOLS_URL: &str = "https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar";

pub struct BuildToolsRunner {
    work_dir: PathBuf,
    java_path: String,
}

impl BuildToolsRunner {
    pub fn new(work_dir: PathBuf) -> Self {
        Self {
            work_dir,
            java_path: std::env::var("JAVA_PATH").unwrap_or_else(|_| "java".to_string()),
        }
    }

    /// Download BuildTools.jar if not already present
    pub async fn ensure_buildtools(&self) -> Result<PathBuf> {
        let buildtools_path = self.work_dir.join("BuildTools.jar");

        if !buildtools_path.exists() {
            tracing::info!("Downloading BuildTools...");
            let response = reqwest::get(BUILDTOOLS_URL).await?;
            let bytes = response.bytes().await?;
            fs::write(&buildtools_path, &bytes).await?;
            tracing::info!("BuildTools downloaded");
        }

        Ok(buildtools_path)
    }

    /// Build a specific Minecraft version
    pub async fn build_version(&self, version: &str, output_type: BuildType) -> Result<BuildResult> {
        let buildtools_path = self.ensure_buildtools().await?;

        // Create version-specific work directory
        let version_dir = self.work_dir.join(format!("build-{}", version));
        fs::create_dir_all(&version_dir).await?;

        let compile_flag = match output_type {
            BuildType::Spigot => "--compile SPIGOT",
            BuildType::CraftBukkit => "--compile CRAFTBUKKIT",
        };

        tracing::info!("Building {} for version {}...", output_type.name(), version);

        // Run BuildTools
        let output = Command::new(&self.java_path)
            .current_dir(&version_dir)
            .args([
                "-jar",
                buildtools_path.to_str().unwrap(),
                "--rev",
                version,
                compile_flag,
            ])
            .output()
            .context("Failed to execute BuildTools")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("BuildTools failed: {}", stderr);
        }

        // Find the output jar
        let output_pattern = match output_type {
            BuildType::Spigot => format!("spigot-{}.jar", version),
            BuildType::CraftBukkit => format!("craftbukkit-{}.jar", version),
        };

        let jar_path = version_dir.join(&output_pattern);
        if !jar_path.exists() {
            anyhow::bail!("Expected output jar not found: {}", output_pattern);
        }

        // Calculate SHA256
        let contents = fs::read(&jar_path).await?;
        let sha256 = calculate_sha256(&contents);
        let file_size = contents.len() as i64;

        Ok(BuildResult {
            jar_path,
            file_name: output_pattern,
            file_size,
            sha256,
        })
    }

    /// Clean up build artifacts
    pub async fn cleanup(&self) -> Result<()> {
        let entries = fs::read_dir(&self.work_dir).await?;
        // TODO: Implement cleanup of old build directories
        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
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
}

#[derive(Debug)]
pub struct BuildResult {
    pub jar_path: PathBuf,
    pub file_name: String,
    pub file_size: i64,
    pub sha256: String,
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
}

