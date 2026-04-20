use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct ProjectData {
    pub json_content: String,
    pub file_path: String,
}

#[tauri::command]
fn save_project(file_path: String, json_content: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    
    // Create parent directory if not exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&path, &json_content).map_err(|e| e.to_string())?;
    
    Ok(format!("Saved to {}", file_path))
}

#[tauri::command]
fn save_file(path: String, contents: String) -> Result<(), String> {
    let file_path = PathBuf::from(&path);
    
    // Create parent directory if not exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&file_path, &contents).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn load_project(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, save_project, load_project, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
