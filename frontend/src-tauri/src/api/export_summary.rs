use log::{error as log_error, info as log_info};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use std::path::PathBuf;

use crate::{
    database::repositories::setting::SettingsRepository,
    state::AppState,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportSummaryRequest {
    pub meeting_id: String,
    pub meeting_title: String,
    pub markdown_content: String,
    pub provider: String,
    pub model: String,
    pub created_at: String,
}

/// Get the directory where summary markdown files should be exported
#[tauri::command]
pub async fn api_get_summary_export_directory<R: Runtime>(
    _app: AppHandle<R>,
    state: tauri::State<'_, AppState>,
) -> Result<Option<String>, String> {
    log_info!("api_get_summary_export_directory called");
    let pool = state.db_manager.pool();

    match SettingsRepository::get_summary_export_directory(pool).await {
        Ok(directory) => {
            log_info!("✅ Retrieved summary export directory: {:?}", directory);
            Ok(directory)
        }
        Err(e) => {
            log_error!("❌ Failed to get summary export directory: {}", e);
            Err(e.to_string())
        }
    }
}

/// Set the directory where summary markdown files should be exported
#[tauri::command]
pub async fn api_set_summary_export_directory<R: Runtime>(
    _app: AppHandle<R>,
    state: tauri::State<'_, AppState>,
    directory: String,
) -> Result<(), String> {
    log_info!("api_set_summary_export_directory called: {:?}", directory);
    let pool = state.db_manager.pool();

    let path = PathBuf::from(&directory);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", directory));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", directory));
    }

    match SettingsRepository::set_summary_export_directory(pool, &directory).await {
        Ok(_) => {
            log_info!("✅ Summary export directory set successfully: {}", directory);
            Ok(())
        }
        Err(e) => {
            log_error!("❌ Failed to set summary export directory: {}", e);
            Err(e.to_string())
        }
    }
}

/// Export summary to markdown file
#[tauri::command]
pub async fn api_export_summary_markdown<R: Runtime>(
    _app: AppHandle<R>,
    state: tauri::State<'_, AppState>,
    meeting_id: String,
    meeting_title: String,
    markdown_content: String,
    provider: String,
    model: String,
    created_at: String,
) -> Result<String, String> {
    log_info!("api_export_summary_markdown called for meeting: {}", meeting_id);
    let pool = state.db_manager.pool();

    // Get the export directory
    let export_dir_opt = match SettingsRepository::get_summary_export_directory(pool).await {
        Ok(dir) => dir,
        Err(e) => {
            log_error!("❌ Failed to get export directory: {}", e);
            return Err(e.to_string());
        }
    };

    let export_dir = match export_dir_opt {
        Some(dir) => dir,
        None => return Err("No export directory configured in Preferences".to_string()),
    };

    let export_path = PathBuf::from(&export_dir);

    // Validate export path
    if !export_path.exists() {
        return Err(format!(
            "Export directory does not exist: {}",
            export_path.display()
        ));
    }

    if !export_path.is_dir() {
        return Err(format!(
            "Export path is not a directory: {}",
            export_path.display()
        ));
    }

    // Sanitize meeting title for filename (remove invalid characters)
    let sanitized_title = meeting_title
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect::<String>();

    // Parse the created_at timestamp and format it
    let timestamp = chrono::DateTime::parse_from_rfc3339(&created_at)
        .or_else(|_| {
            // Try parsing as naive datetime and assume UTC
            chrono::NaiveDateTime::parse_from_str(&created_at, "%Y-%m-%dT%H:%M:%S%.f")
                .map(|naive| {
                    chrono::DateTime::<chrono::Utc>::from_naive_utc_and_offset(
                        naive,
                        chrono::Utc,
                    )
                    .into()
                })
        })
        .unwrap_or_else(|_| chrono::Local::now().into());

    let date_str = timestamp.format("%Y-%m-%d").to_string();
    let time_str = timestamp.format("%H:%M").to_string();
    // Use hyphens instead of colons in filename for filesystem compatibility
    let datetime_for_filename = timestamp.format("%Y-%m-%d %H-%M").to_string();

    // Create the base filename
    let base_filename = format!("{} - {}.md", sanitized_title, datetime_for_filename);
    let mut final_path = export_path.join(&base_filename);

    // Check if file exists and add suffix if needed
    let mut counter = 1;
    while final_path.exists() {
        let filename_with_suffix =
            format!("{} - {} ({}).md", sanitized_title, datetime_for_filename, counter);
        final_path = export_path.join(&filename_with_suffix);
        counter += 1;
    }

    // Build the markdown content with metadata
    let full_content = format!(
        "# {}\n\n**Date:** {} {}\n\n**Summarized by:** {}/{}\n\n---\n\n{}",
        meeting_title, date_str, time_str, provider, model, markdown_content
    );

    // Write the file
    match std::fs::write(&final_path, full_content) {
        Ok(_) => {
            let path_str = final_path.to_string_lossy().to_string();
            log_info!("✅ Successfully exported summary to: {}", path_str);
            Ok(path_str)
        }
        Err(e) => {
            log_error!("❌ Failed to write summary file: {}", e);
            Err(format!("Failed to write summary file: {}", e))
        }
    }
}

#[cfg(test)]
mod export_summary_tests;
