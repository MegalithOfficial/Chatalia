// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod crypto;
mod settings;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            settings::load_app_settings,
            settings::save_app_settings
            // Add other async commands like get_ai_response, test_api_connection later
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            match app_handle.path().app_data_dir() { 
               Ok(dir) => {
                    println!("Resolved app data directory: {:?}", dir);
                    if !dir.exists() {
                        println!("App data directory does not exist, attempting creation...");
                        match std::fs::create_dir_all(&dir) {
                            Ok(_) => println!("App data directory created successfully."),
                            Err(e) => {
                               eprintln!("FATAL: Failed to create app data directory at {:?}: {}", dir, e);
                            }
                        }
                    } else {
                        println!("App data directory already exists.");
                    }
                    println!("Setup complete. Key check deferred to first use.");
                }
                Err(e) => { 
                    eprintln!("FATAL: Could not resolve app data directory! Settings/Keys cannot be saved. Error: {}", e);
                }
           }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
