use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// TTS 配置参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsConfig {
    pub voice_id: String,
    pub speed: f64,    // 语速 0.5-2.0
    pub pitch: f64,   // 音调 0.5-2.0
    pub volume: f64,  // 音量 0-1
}

impl Default for TtsConfig {
    fn default() -> Self {
        Self {
            voice_id: "zhiwei".to_string(),
            speed: 1.0,
            pitch: 1.0,
            volume: 1.0,
        }
    }
}

/// 生成占位音频文件（WAV格式）
/// 这是一个模拟实现，实际应该调用真实的 TTS API
pub fn generate_placeholder_audio(
    text: &str,
    config: &TtsConfig,
    output_dir: &PathBuf,
) -> Result<PathBuf, String> {
    // 确保输出目录存在
    if !output_dir.exists() {
        fs::create_dir_all(output_dir).map_err(|e| format!("创建目录失败: {}", e))?;
    }

    // 生成文件名（基于文本哈希和时间戳）
    let file_name = format!(
        "tts_{}_{}.wav",
        text.len(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    );
    let output_path = output_dir.join(&file_name);

    // 生成简单的 WAV 文件（静音占位）
    // 实际应用中，这里应该调用真实的 TTS API
    let duration_seconds = calculate_audio_duration(text, config.speed);
    let sample_rate = 44100;
    let channels = 1;
    let bits_per_sample = 16;
    let duration_samples = (duration_seconds * sample_rate as f64) as usize;
    
    // WAV 文件头
    let data_size = duration_samples * channels * (bits_per_sample / 8);
    let file_size = 36 + data_size;
    
    let mut wav_data = Vec::new();
    
    // RIFF header
    wav_data.extend_from_slice(b"RIFF");
    wav_data.extend_from_slice(&(file_size as u32).to_le_bytes());
    wav_data.extend_from_slice(b"WAVE");
    
    // fmt chunk
    wav_data.extend_from_slice(b"fmt ");
    wav_data.extend_from_slice(&16u32.to_le_bytes()); // fmt chunk size
    wav_data.extend_from_slice(&1u16.to_le_bytes());  // audio format (PCM)
    wav_data.extend_from_slice(&(channels as u16).to_le_bytes());
    wav_data.extend_from_slice(&(sample_rate as u32).to_le_bytes());
    wav_data.extend_from_slice(&((sample_rate * channels * (bits_per_sample / 8)) as u32).to_le_bytes()); // byte rate
    wav_data.extend_from_slice(&((channels * (bits_per_sample / 8)) as u16).to_le_bytes()); // block align
    wav_data.extend_from_slice(&(bits_per_sample as u16).to_le_bytes());
    
    // data chunk
    wav_data.extend_from_slice(b"data");
    wav_data.extend_from_slice(&(data_size as u32).to_le_bytes());
    
    // 生成静音数据（全零）
    wav_data.resize(wav_data.len() + data_size, 0);
    
    // 写入文件
    fs::write(&output_path, wav_data)
        .map_err(|e| format!("写入音频文件失败: {}", e))?;

    Ok(output_path)
}

/// 计算音频预计时长（秒）
/// 基于中文字符数，假设平均每个字符 0.3 秒
/// 排除 SSML 标记，但加上停顿标记的时长
pub fn calculate_audio_duration(text: &str, speed: f64) -> f64 {
    // 使用正则表达式移除所有标签，只计算纯文本字符数
    let re = regex::Regex::new(r"<[^>]+>").unwrap();
    let cleaned_text = re.replace_all(text, "");
    
    // 计算纯文本字符数
    let char_count = cleaned_text.chars().count();
    
    // 基础时长：每分钟 200 字
    let words_per_minute = 200.0 * speed;
    let words_per_second = words_per_minute / 60.0;
    let base_duration = char_count as f64 / words_per_second;
    
    // 提取所有停顿标记的时长（毫秒）
    let pause_re = regex::Regex::new(r#"<pause\s+ms=["'](\d+)["']\s*/>"#).unwrap();
    let mut total_pause_ms = 0u64;
    for cap in pause_re.captures_iter(text) {
        if let Ok(ms) = cap[1].parse::<u64>() {
            total_pause_ms += ms;
        }
    }
    
    // 将停顿时长转换为秒并加上
    let pause_duration = total_pause_ms as f64 / 1000.0;
    
    (base_duration + pause_duration).ceil()
}

/// 获取可用的发音人列表（模拟数据）
pub fn get_voice_list() -> Vec<VoiceInfo> {
    vec![
        VoiceInfo {
            id: "zhiwei".to_string(),
            name: "解说-知韦(紧凑版)".to_string(),
            gender: "male".to_string(),
            language: "zh-CN".to_string(),
            description: "专业解说风格，适合新闻、教育类内容".to_string(),
        },
        VoiceInfo {
            id: "xiaoyu".to_string(),
            name: "温柔-小语(女)".to_string(),
            gender: "female".to_string(),
            language: "zh-CN".to_string(),
            description: "温柔甜美，适合情感类、故事类内容".to_string(),
        },
        VoiceInfo {
            id: "xiaofeng".to_string(),
            name: "活泼-小风(男)".to_string(),
            gender: "male".to_string(),
            language: "zh-CN".to_string(),
            description: "活泼开朗，适合儿童、娱乐类内容".to_string(),
        },
        VoiceInfo {
            id: "xiaomei".to_string(),
            name: "知性-小美(女)".to_string(),
            gender: "female".to_string(),
            language: "zh-CN".to_string(),
            description: "知性优雅，适合商务、知识类内容".to_string(),
        },
    ]
}

/// 发音人信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceInfo {
    pub id: String,
    pub name: String,
    pub gender: String,
    pub language: String,
    pub description: String,
}
