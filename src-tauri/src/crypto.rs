use aes_gcm::aead::{Aead, OsRng};
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use thiserror::Error;

pub const NONCE_SIZE: usize = 12;

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("AEAD encryption/decryption failed")]
    AeadError,
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Failed to get machine ID")]
    MachineIdError,
    #[error("Failed to get app data directory")]
    AppDataDirError,
    #[error("Base64 decoding failed: {0}")]
    Base64DecodeError(#[from] base64::DecodeError),
    #[error("Invalid data format or length")]
    FormatError,
    #[error("UTF-8 conversion failed: {0}")]
    Utf8Error(#[from] std::string::FromUtf8Error),
    #[error("Key derivation failed: Invalid key length")]
    KeyDerivationError,
    #[error("Shell command execution failed: {0}")]
    ShellCommandError(String),
}

async fn execute_command_async(
    app_handle: &AppHandle,
    cmd: &str,
    args: Vec<&str>,
) -> Result<String, CryptoError> {
    app_handle
        .shell()
        .command(cmd)
        .args(args)
        .output()
        .await
        .map_err(|e| CryptoError::ShellCommandError(e.to_string()))
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .map_err(CryptoError::from)
                    .map(|s| s.trim().to_string())
            } else {
                let stderr_string = String::from_utf8_lossy(&output.stderr).to_string();
                Err(CryptoError::ShellCommandError(format!(
                    "Command failed with status {:?}: {}",
                    output.status, stderr_string
                )))
            }
        })
}

#[cfg(target_os = "windows")]
async fn get_machine_id_os(app_handle: &AppHandle) -> Result<String, CryptoError> {
    execute_command_async(app_handle, "wmic", vec!["csproduct", "get", "UUID"])
        .await // await
        .and_then(|uuid_output| {
            uuid_output
                .lines()
                .nth(1)
                .map(|s| s.trim().to_string())
                .ok_or(CryptoError::MachineIdError)
        })
}

#[cfg(target_os = "linux")]
async fn get_machine_id_os(_app_handle: &AppHandle) -> Result<String, CryptoError> {
    tokio::task::spawn_blocking(|| {
        fs::read_to_string("/etc/machine-id")
            .or_else(|_| fs::read_to_string("/var/lib/dbus/machine-id"))
            .map(|s| s.trim().to_string())
    })
    .await
    .map_err(|e| {
        CryptoError::IoError(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Task join error: {}", e),
        ))
    })?
    .map_err(CryptoError::IoError)
}

#[cfg(target_os = "macos")]
async fn get_machine_id_os(app_handle: &AppHandle) -> Result<String, CryptoError> {
    execute_command_async(
        app_handle,
        "ioreg",
        vec!["-rd1", "-c", "IOPlatformExpertDevice"],
    )
    .await // await
    .and_then(|output_str| {
        output_str
            .lines()
            .find(|line| line.contains("IOPlatformUUID"))
            .and_then(|line| line.split('"').nth(3))
            .map(|uuid| uuid.to_string())
            .ok_or(CryptoError::MachineIdError)
    })
}

pub async fn get_machine_id(app_handle: &AppHandle) -> Result<String, CryptoError> {
    get_machine_id_os(app_handle).await
}

async fn generate_device_key(app_handle: &AppHandle) -> Result<Key<Aes256Gcm>, CryptoError> {
    let machine_id = get_machine_id(app_handle).await?;
    let mut random_salt: [u8; 16] = [0; 16];
    OsRng.fill_bytes(&mut random_salt);

    let mut hasher = Sha256::default();
    hasher.update(machine_id.as_bytes());
    hasher.update(&random_salt);
    let key_bytes = hasher.finalize();

    let app_data_dir = app_handle
        .path()
        .app_data_dir() 
        .map_err(|e| {
            eprintln!("Tauri path resolver error: {}", e); 
            CryptoError::AppDataDirError
        })?;

    fs::create_dir_all(&app_data_dir)?;
    fs::write(app_data_dir.join("key.salt"), &random_salt)?;

    Ok(Key::<Aes256Gcm>::clone_from_slice(key_bytes.as_slice()))
}

pub async fn get_key(app_handle: &AppHandle) -> Result<Key<Aes256Gcm>, CryptoError> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir() 
        .map_err(|e| {
            eprintln!("Tauri path resolver error: {}", e);
            CryptoError::AppDataDirError 
        })?;
    let salt_path = app_data_dir.join("key.salt");

    if salt_path.exists() {
        let random_salt = fs::read(salt_path)?;
        let machine_id = get_machine_id(app_handle).await?; // await machine ID

        let mut hasher = Sha256::default();
        hasher.update(machine_id.as_bytes());
        hasher.update(&random_salt);
        let key_bytes = hasher.finalize();

        Ok(Key::<Aes256Gcm>::clone_from_slice(key_bytes.as_slice()))
    } else {
        generate_device_key(app_handle).await
    }
}

pub async fn encrypt(app_handle: &AppHandle, text: &str) -> Result<Vec<u8>, CryptoError> {
    let key = get_key(app_handle).await?;
    let cipher = Aes256Gcm::new(&key);

    let mut nonce_bytes = [0u8; NONCE_SIZE];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, text.as_bytes())
        .map_err(|_| CryptoError::AeadError)?;

    let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

pub async fn decrypt(app_handle: &AppHandle, encrypted_data: &[u8]) -> Result<String, CryptoError> {
    if encrypted_data.len() <= NONCE_SIZE {
        return Err(CryptoError::FormatError);
    }

    let nonce = Nonce::from_slice(&encrypted_data[..NONCE_SIZE]);
    let ciphertext = &encrypted_data[NONCE_SIZE..];

    let key = get_key(app_handle).await?;
    let cipher = Aes256Gcm::new(&key);

    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| CryptoError::AeadError)?;

    let decrypted_string = String::from_utf8(decrypted_bytes)?;

    Ok(decrypted_string)
}

pub async fn encrypt_to_base64(app_handle: &AppHandle, text: &str) -> Result<String, CryptoError> {
    let encrypted_bytes = encrypt(app_handle, text).await?;
    Ok(BASE64.encode(encrypted_bytes))
}

pub async fn decrypt_base64(
    app_handle: &AppHandle,
    base64_text: &str,
) -> Result<String, CryptoError> {
    let encrypted_data = BASE64.decode(base64_text)?;
    decrypt(app_handle, &encrypted_data).await
}
