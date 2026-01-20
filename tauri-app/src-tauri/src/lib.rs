// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod tts;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use tts::{TtsConfig, VoiceInfo, generate_placeholder_audio, calculate_audio_duration, get_voice_list};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 生成音频文件
#[tauri::command]
async fn generate_audio(
    text: String,
    config: TtsConfig,
    app: tauri::AppHandle,
) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    // 创建 audio_cache 子目录
    let audio_cache_dir = app_data_dir.join("audio_cache");

    // 生成音频文件
    let audio_path = generate_placeholder_audio(&text, &config, &audio_cache_dir)
        .map_err(|e| format!("生成音频失败: {}", e))?;

    // 返回文件路径（转换为字符串）
    audio_path
        .to_str()
        .ok_or_else(|| "路径转换失败".to_string())
        .map(|s| s.to_string())
}

/// 获取可用发音人列表
#[tauri::command]
fn get_voice_list_command() -> Vec<VoiceInfo> {
    get_voice_list()
}

/// 计算预计时长（秒）
#[tauri::command]
fn calculate_duration(text: String, speed: f64) -> f64 {
    calculate_audio_duration(&text, speed)
}

/// 导出音频文件
#[tauri::command]
async fn export_audio(
    source_path: String,
    target_path: String,
    format: String, // "mp3" | "wav"
    app: tauri::AppHandle,
) -> Result<String, String> {
    use std::fs;
    
    let source = PathBuf::from(&source_path);
    let target = PathBuf::from(&target_path);
    
    // 检查源文件是否存在
    if !source.exists() {
        return Err(format!("源文件不存在: {}", source_path));
    }
    
    // 确保目标目录存在
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建目标目录失败: {}", e))?;
    }
    
    // 目前只支持直接复制（WAV格式）
    // 实际应用中，这里应该进行格式转换
    if format.to_lowercase() == "wav" {
        fs::copy(&source, &target)
            .map_err(|e| format!("复制文件失败: {}", e))?;
    } else {
        // 对于其他格式，暂时返回错误
        // 后续可以使用音频处理库进行转换
        return Err(format!("暂不支持 {} 格式导出，请使用 WAV 格式", format));
    }
    
    target
        .to_str()
        .ok_or_else(|| "路径转换失败".to_string())
        .map(|s| s.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_audio,
            get_voice_list_command,
            calculate_duration,
            export_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
