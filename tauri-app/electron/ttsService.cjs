const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// 设置 FFmpeg 路径
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * TTS 配置接口
 * @typedef {Object} TtsConfig
 * @property {string} voice_id - 发音人ID
 * @property {number} speed - 语速 0.5-2.0
 * @property {number} pitch - 音调 0.5-2.0
 * @property {number} volume - 音量 0-1
 */

/**
 * 发音人信息
 * @typedef {Object} VoiceInfo
 * @property {string} id
 * @property {string} name
 * @property {string} gender
 * @property {string} language
 * @property {string} description
 */

/**
 * 获取音频缓存目录
 * @returns {string}
 */
function getAudioCacheDir() {
    const userDataPath = app.getPath('userData');
    const cacheDir = path.join(userDataPath, 'audio_cache');

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    return cacheDir;
}

/**
 * 生成占位音频文件 (WAV格式)
 * @param {string} text - 要转换的文本
 * @param {TtsConfig} config - TTS 配置
 * @returns {Promise<string>} 音频文件路径
 */
async function generateAudio(text, config) {
    const outputDir = getAudioCacheDir();

    // 生成文件名
    const timestamp = Date.now();
    const fileName = `tts_${text.length}_${timestamp}.wav`;
    const outputPath = path.join(outputDir, fileName);

    // 计算音频时长
    const durationSeconds = calculateDuration(text, config.speed || 1.0);

    // 生成 WAV 文件
    const sampleRate = 44100;
    const channels = 1;
    const bitsPerSample = 16;
    const durationSamples = Math.floor(durationSeconds * sampleRate);
    const dataSize = durationSamples * channels * (bitsPerSample / 8);
    const fileSize = 36 + dataSize;

    // 创建 WAV 文件 buffer
    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(fileSize, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
    buffer.writeUInt16LE(1, offset); offset += 2;  // audio format (PCM)
    buffer.writeUInt16LE(channels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), offset); offset += 4; // byte rate
    buffer.writeUInt16LE(channels * (bitsPerSample / 8), offset); offset += 2; // block align
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // 音频数据全部为静音 (已经是 0)

    // 写入文件
    await fs.promises.writeFile(outputPath, buffer);

    return outputPath;
}

/**
 * 计算音频预计时长 (秒)
 * @param {string} text - 文本内容
 * @param {number} speed - 语速
 * @returns {number}
 */
function calculateDuration(text, speed = 1.0) {
    // 移除 SSML 标签
    const cleanedText = text.replace(/<[^>]+>/g, '');

    // 计算纯文本字符数
    const charCount = cleanedText.length;

    // 基础时长：每分钟 200 字
    const wordsPerMinute = 200 * speed;
    const wordsPerSecond = wordsPerMinute / 60;
    const baseDuration = charCount / wordsPerSecond;

    // 提取停顿标记时长
    const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
    let totalPauseMs = 0;
    let match;
    while ((match = pauseRegex.exec(text)) !== null) {
        totalPauseMs += parseInt(match[1], 10);
    }

    const pauseDuration = totalPauseMs / 1000;

    return Math.ceil(baseDuration + pauseDuration);
}

/**
 * 获取可用发音人列表
 * @returns {VoiceInfo[]}
 */
function getVoiceList() {
    return [
        {
            id: 'zhiwei',
            name: '解说-知韦(紧凑版)',
            gender: 'male',
            language: 'zh-CN',
            description: '专业解说风格，适合新闻、教育类内容',
        },
        {
            id: 'xiaoyu',
            name: '温柔-小语(女)',
            gender: 'female',
            language: 'zh-CN',
            description: '温柔甜美，适合情感类、故事类内容',
        },
        {
            id: 'xiaofeng',
            name: '活泼-小风(男)',
            gender: 'male',
            language: 'zh-CN',
            description: '活泼开朗，适合儿童、娱乐类内容',
        },
        {
            id: 'xiaomei',
            name: '知性-小美(女)',
            gender: 'female',
            language: 'zh-CN',
            description: '知性优雅，适合商务、知识类内容',
        },
    ];
}

/**
 * 导出音频文件 (支持 WAV 和 MP3 格式)
 * @param {string} sourcePath - 源文件路径
 * @param {string} targetPath - 目标文件路径
 * @param {string} format - 导出格式 ('wav' | 'mp3')
 * @returns {Promise<string>}
 */
async function exportAudio(sourcePath, targetPath, format = 'wav') {
    // 检查源文件是否存在
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`源文件不存在: ${sourcePath}`);
    }

    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    if (format.toLowerCase() === 'wav') {
        // WAV 格式直接复制
        await fs.promises.copyFile(sourcePath, targetPath);
        return targetPath;
    } else if (format.toLowerCase() === 'mp3') {
        // 使用 FFmpeg 转换为 MP3
        return new Promise((resolve, reject) => {
            ffmpeg(sourcePath)
                .audioCodec('libmp3lame')
                .audioBitrate(192)
                .on('end', () => {
                    console.log('MP3 转换完成:', targetPath);
                    resolve(targetPath);
                })
                .on('error', (err) => {
                    console.error('MP3 转换失败:', err);
                    reject(new Error(`MP3 转换失败: ${err.message}`));
                })
                .save(targetPath);
        });
    } else {
        throw new Error(`不支持的格式: ${format}`);
    }
}

/**
 * 混合背景音乐
 * @param {string} voicePath - 语音文件路径
 * @param {string} bgmPath - 背景音乐路径
 * @param {Object} options - 混合选项
 * @param {number} options.bgmVolume - BGM 音量 (0-1, 默认 0.3)
 * @param {number} options.voiceVolume - 语音音量 (0-1, 默认 1.0)
 * @returns {Promise<string>} 输出文件路径
 */
async function mixBackgroundMusic(voicePath, bgmPath, options = {}) {
    const { bgmVolume = 0.3, voiceVolume = 1.0 } = options;

    // 检查文件是否存在
    if (!fs.existsSync(voicePath)) {
        throw new Error(`语音文件不存在: ${voicePath}`);
    }
    if (!fs.existsSync(bgmPath)) {
        throw new Error(`背景音乐文件不存在: ${bgmPath}`);
    }

    const outputDir = getAudioCacheDir();
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `mixed_${timestamp}.wav`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(voicePath)
            .input(bgmPath)
            .complexFilter([
                // 调整语音音量
                `[0:a]volume=${voiceVolume}[voice]`,
                // 调整 BGM 音量并循环
                `[1:a]volume=${bgmVolume},aloop=loop=-1:size=2e+09[bgm]`,
                // 混合两个音轨，以语音时长为准
                `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]`
            ])
            .outputOptions(['-map', '[out]'])
            .audioCodec('pcm_s16le')
            .on('end', () => {
                console.log('背景音乐混合完成:', outputPath);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('背景音乐混合失败:', err);
                reject(new Error(`混合失败: ${err.message}`));
            })
            .save(outputPath);
    });
}

/**
 * 读取文本文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文件内容
 */
async function importTextFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
}

/**
 * 导出项目配置
 * @param {Object} projectData - 项目数据
 * @param {string} targetPath - 目标路径
 * @returns {Promise<string>}
 */
async function exportProject(projectData, targetPath) {
    const projectJson = JSON.stringify(projectData, null, 2);
    await fs.promises.writeFile(targetPath, projectJson, 'utf-8');
    return targetPath;
}

/**
 * 导入项目配置
 * @param {string} filePath - 项目文件路径
 * @returns {Promise<Object>}
 */
async function importProject(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`项目文件不存在: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * 获取预设背景音乐列表
 * @returns {Array}
 */
function getPresetBgmList() {
    return [
        { id: 'none', name: '无背景音乐', path: null },
        { id: 'soft', name: '轻柔钢琴', path: 'preset/soft_piano.mp3' },
        { id: 'upbeat', name: '轻快节奏', path: 'preset/upbeat.mp3' },
        { id: 'corporate', name: '商务风格', path: 'preset/corporate.mp3' },
        { id: 'nature', name: '自然环境', path: 'preset/nature.mp3' },
    ];
}

module.exports = {
    generateAudio,
    getVoiceList,
    calculateDuration,
    exportAudio,
    mixBackgroundMusic,
    importTextFile,
    exportProject,
    importProject,
    getPresetBgmList,
};

