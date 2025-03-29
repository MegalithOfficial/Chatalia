use crate::crypto;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatSettings {
    model: String,
    temperature: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    top_p: Option<f32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiProviderConfig {
    id: String,
    provider_id: String,
    name: String,
    api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    base_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    default_chat_settings: ChatSettings,
    api_providers: Vec<ApiProviderConfig>,
    send_with_enter: bool,
}

fn default_chat_settings() -> ChatSettings {
    ChatSettings {
        model: "gpt-4o-mini".to_string(),
        temperature: 0.7,
        system_prompt: None,
        max_tokens: None,
        top_p: None,
    }
}

fn default_app_settings() -> AppSettings {
    AppSettings {
        default_chat_settings: default_chat_settings(),
        api_providers: Vec::new(),
        send_with_enter: true,
    }
}

fn get_settings_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    app_handle
        .path()
        .app_data_dir()
        .map(|dir| dir.join("settings.json"))
        .map_err(|_| "Could not resolve app data directory".to_string())
}

#[tauri::command]
pub async fn load_app_settings(app_handle: AppHandle) -> Result<AppSettings, String> {
    let path = get_settings_path(&app_handle)?;
    println!("Attempting to load settings from: {:?}", path);

    if !path.exists() {
        println!("Settings file not found at specified path, returning defaults.");
        return Ok(default_app_settings());
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read settings file: {}", e))?;

    if contents.trim().is_empty() {
        return Ok(default_app_settings());
    }

    let mut settings: AppSettings =
        serde_json::from_str(&contents).map_err(|e| format!("Parse: {}", e))?;

    println!("Deserialized. Decrypting keys...");

    for provider in &mut settings.api_providers {
        if !provider.api_key.is_empty() {
            match crypto::decrypt_base64(&app_handle, &provider.api_key).await {
                Ok(decrypted_key) => provider.api_key = decrypted_key,
                Err(e) => {
                    eprintln!("WARN: Failed to decrypt key for '{}': {}", provider.name, e);
                    provider.api_key = String::new();
                }
            }
        }
    }
    println!("Settings loaded.");
    Ok(settings)
}

#[tauri::command]
pub async fn save_app_settings(app_handle: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path(&app_handle)?;
    println!("Saving settings to: {:?}", path);

    if let Some(parent_dir) = path.parent() {
        if !parent_dir.exists() {
            println!(
                "Parent directory does not exist, creating: {:?}",
                parent_dir
            );
            fs::create_dir_all(parent_dir)
                .map_err(|e| format!("Failed to create settings directory: {}", e))?;
        }
    } else {
        return Err("Invalid settings file path (no parent directory).".to_string());
    }

    let mut settings_to_save = settings.clone();

    for provider in &mut settings_to_save.api_providers {
        if !provider.api_key.is_empty() {
            match crypto::encrypt_to_base64(&app_handle, &provider.api_key).await {
                Ok(encrypted_key_b64) => provider.api_key = encrypted_key_b64,
                Err(e) => {
                    return Err(format!("Failed encrypt key for {}: {}", provider.name, e));
                }
            }
        }
    }

    let serialized_settings = serde_json::to_string_pretty(&settings_to_save)
        .map_err(|e| format!("Failed serialize: {}", e))?;

    fs::write(&path, serialized_settings.as_bytes()) // Use the full path
        .map_err(|e| format!("Failed write settings file: {}", e))?;

        println!("Settings saved successfully to {:?}", path);
        Ok(())
}
