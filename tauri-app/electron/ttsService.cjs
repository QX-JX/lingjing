const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const { spawn } = require('child_process');
const numberConverter = require('./numberConverter.cjs');

// 设置 FFmpeg 路径
let ffmpegPath;
if (app.isPackaged) {
    ffmpegPath = path.join(process.resourcesPath, 'ffmpeg.exe');
} else {
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
}
ffmpeg.setFfmpegPath(ffmpegPath);

// 生成任务取消控制
let cancelRequested = false;
let currentPythonProcess = null;

function resetCancelFlag() {
    cancelRequested = false;
}

function ensureNotCancelled() {
    if (cancelRequested) {
        throw new Error('GenerationCancelled');
    }
}

function cancelGenerateAudio() {
    cancelRequested = true;
    if (currentPythonProcess) {
        try {
            currentPythonProcess.kill();
        } catch (e) { }
        currentPythonProcess = null;
    }
}

/**
 * 发音人映射表 (Mock ID -> Edge TTS Voice Name)
 * 
 * edge-tts 支持的所有免费中文发音人（共14个）：
 * - 中国大陆标准（6个）：云希、晓晓、云野、晓伊、云健、云霞
 * - 中国大陆方言（2个）：晓北（东北话）、晓妮（陕西话）
 * - 香港（3个）：云龙、晓佳、晓曼
 * - 台湾（3个）：云哲、晓辰、晓语
 */
const VOICE_MAPPING = {
    // 中国大陆标准发音人（6个）
    'zhiwei': 'zh-CN-YunxiNeural',          // 云希 (男) - 活泼灵动
    'xiaoyu': 'zh-CN-XiaoxiaoNeural',       // 晓晓 (女) - 全能情感
    'xiaofeng': 'zh-CN-YunyangNeural',      // 云野 (男) - 专业稳重
    'xiaomei': 'zh-CN-XiaoyiNeural',        // 晓伊 (女) - 温柔甜美
    'yunjian': 'zh-CN-YunjianNeural',      // 云健 (男) - 激情澎湃
    'yunxia': 'zh-CN-YunxiaNeural',         // 云霞 (女/儿童) - 可爱童真

    // 中国大陆方言发音人（2个）
    'xiaobei': 'zh-CN-liaoning-XiaobeiNeural',  // 晓北 (女) - 东北话
    'xiaoni': 'zh-CN-shaanxi-XiaoniNeural',     // 晓妮 (女) - 陕西话

    // 香港发音人（3个）
    'wanlong': 'zh-HK-WanLungNeural',      // 云龙 (男) - 香港
    'hiugaai': 'zh-HK-HiuGaaiNeural',       // 晓佳 (女) - 香港粤语
    'hiumaan': 'zh-HK-HiuMaanNeural',       // 晓曼 (女) - 香港

    // 台湾发音人（3个）
    'yunjhe': 'zh-TW-YunJheNeural',         // 云哲 (男) - 台湾
    'hsiaochen': 'zh-TW-HsiaoChenNeural',   // 晓辰 (女) - 台湾
    'hsiaoyu': 'zh-TW-HsiaoYuNeural',       // 晓语 (女) - 台湾
};

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
 * 获取正确的资源路径（考虑 asar.unpacked）
 * 在打包后，由于 asarUnpack 配置，资源文件在 app.asar.unpacked 目录中
 * @param {string} relativePath - 相对于 dist 的路径，如 'sounds/bgm/upbeat.mp3'
 * @returns {string} 绝对路径
 */
function getResourcePath(relativePath) {
    if (app.isPackaged) {
        // 生产环境：资源在 app.asar.unpacked/dist/ 目录中
        const appPath = app.getAppPath();
        // app.getAppPath() 返回 .../resources/app.asar
        // 解包的文件在 .../resources/app.asar.unpacked/dist/...
        const unpackedPath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
        const resourcePath = path.join(unpackedPath, 'dist', relativePath);
        
        // 如果解包路径存在，使用它
        if (fs.existsSync(resourcePath)) {
            return resourcePath;
        }
        
        // 备用方案：尝试在 app.asar 内部查找（虽然不应该在这里）
        const asarPath = path.join(appPath, relativePath);
        if (fs.existsSync(asarPath)) {
            return asarPath;
        }
        
        // 如果都不存在，返回解包路径（让调用者处理错误）
        return resourcePath;
    } else {
        // 开发环境：资源在 public 目录中
        return path.join(__dirname, '..', 'public', relativePath);
    }
}

/**
 * 获取 Python TTS 引擎路径
 * 开发环境: python python/tts_wrapper.py
 * 生产环境: resources/tts_wrapper.exe
 */
function getPythonEngine() {
    if (app.isPackaged) {
        // 生产环境：使用打包后的 exe
        const exePath = path.join(process.resourcesPath, 'tts_wrapper.exe');
        
        // 添加详细的日志
        console.log('[TTS] 生产环境 - 查找 tts_wrapper.exe:', {
            resourcesPath: process.resourcesPath,
            exePath: exePath,
            exists: fs.existsSync(exePath),
            isPackaged: app.isPackaged
        });
        
        if (!fs.existsSync(exePath)) {
            console.error('[TTS] 错误: tts_wrapper.exe 不存在于:', exePath);
            // 尝试其他可能的位置
            const alternativePaths = [
                path.join(app.getAppPath(), 'resources', 'tts_wrapper.exe'),
                path.join(__dirname, '../../resources/tts_wrapper.exe'),
            ];
            
            for (const altPath of alternativePaths) {
                if (fs.existsSync(altPath)) {
                    console.log('[TTS] 在备用位置找到:', altPath);
                    return {
                        command: altPath,
                        args: []
                    };
                }
            }
            
            throw new Error(`tts_wrapper.exe 未找到。已检查: ${exePath}`);
        }
        
        return {
            command: exePath,
            args: []
        };
    } else {
        // 开发环境：使用 python 脚本
        // 假设 python 脚本位于项目根目录的 python/tts_wrapper.py
        // 需要向上找两级 (electron -> tauri-app -> python)
        const scriptPath = path.join(__dirname, '../../python/tts_wrapper.py');
        console.log('[TTS] 开发环境 - 使用 Python 脚本:', {
            scriptPath: scriptPath,
            exists: fs.existsSync(scriptPath)
        });
        return {
            command: 'python',
            args: [scriptPath]
        };
    }
}

/**
 * 调用 Python 引擎生成音频
 */
function generateAudioWithPython(text, voice, rate, volume, pitch, outputPath) {
    return new Promise((resolve, reject) => {
        if (cancelRequested) {
            reject(new Error('GenerationCancelled'));
            return;
        }
        const engine = getPythonEngine();

        // 确保所有参数都有有效值，避免命令行参数错误
        // 检查 rate、volume、pitch 是否为有效字符串（非空且非 undefined）
        let safeRate = (rate && typeof rate === 'string' && rate.trim()) ? rate.trim() : '+0%';
        let safeVolume = (volume && typeof volume === 'string' && volume.trim()) ? volume.trim() : '+0%';
        let safePitch = (pitch && typeof pitch === 'string' && pitch.trim()) ? pitch.trim() : '+0Hz';
        const safeVoice = (voice && typeof voice === 'string' && voice.trim()) ? voice.trim() : 'zh-CN-XiaoxiaoNeural';
        // 清理文本前后的空白字符（包括换行符），避免发送给 edge-tts 时出现问题
        const safeText = (text && typeof text === 'string') ? text.trim() : '';

        // 验证参数有效性
        if (!safeText) {
            reject(new Error('文本内容为空'));
            return;
        }

        // 确保参数值格式正确（移除可能的额外空格或特殊字符）
        safeRate = safeRate.replace(/\s+/g, '');
        safeVolume = safeVolume.replace(/\s+/g, '');
        safePitch = safePitch.replace(/\s+/g, '');

        // 调试日志
        console.log('[TTS] ========== generateAudioWithPython 调用 ==========');
        console.log('[TTS] generateAudioWithPython 原始参数:', {
            rate: rate,
            volume: volume,
            pitch: pitch,
            voice: voice,
            textLength: text ? text.length : 0,
            textPreview: text ? text.substring(0, 100) : ''
        });
        console.log('[TTS] generateAudioWithPython 处理后参数:', {
            rate: safeRate,
            volume: safeVolume,
            pitch: safePitch,
            voice: safeVoice,
            textLength: safeText.length,
            textPreview: safeText.substring(0, 100),
            outputPath: outputPath
        });

        // 构建参数数组
        // 对于以 - 开头的值（如 -10%），使用 --key=value 格式，避免 argparse 误判为选项
        const args = [
            ...engine.args,
            '--text', safeText,
            '--voice', safeVoice,
            // 使用 = 连接，避免 argparse 将以 - 开头的值误认为新选项
            `--rate=${safeRate}`,
            `--volume=${safeVolume}`,
            `--pitch=${safePitch}`,
            '--output', outputPath
        ];

        // 验证参数数组中没有任何 undefined 或空值
        for (let i = 0; i < args.length; i++) {
            if (args[i] === undefined || args[i] === null || (typeof args[i] === 'string' && args[i].trim() === '')) {
                console.error(`[TTS] 参数数组第 ${i} 个元素无效:`, args[i], '完整数组:', args);
                reject(new Error(`参数数组第 ${i} 个元素无效: ${args[i]}`));
                return;
            }
        }

        // 日志显示时，用引号包裹可能包含特殊字符的参数
        const logArgs = args.map((arg, index) => {
            // 如果参数值包含空格、% 或其他特殊字符，在日志中用引号包裹
            if (index > 0 && ['--rate', '--volume', '--pitch'].includes(args[index - 1])) {
                return `"${arg}"`;
            }
            return arg;
        });
        console.log(`[TTS] 调用 Python 引擎: ${engine.command} ${logArgs.join(' ')}`);
        console.log(`[TTS] 实际参数数组:`, args);
        console.log(`[TTS] 引擎信息:`, {
            command: engine.command,
            args: engine.args,
            commandExists: fs.existsSync(engine.command),
            isPackaged: app.isPackaged
        });

        // 清除所有代理相关的环境变量，避免 edge-tts 报错
        // edge-tts 不支持 HTTPS 代理，会导致生成失败
        const env = { ...process.env };
        delete env.HTTPS_PROXY;
        delete env.HTTP_PROXY;
        delete env.https_proxy;
        delete env.http_proxy;
        delete env.ALL_PROXY;
        delete env.all_proxy;
        // 强制设置 NO_PROXY 为 *，确保所有连接都不使用代理
        env.NO_PROXY = '*';
        env.no_proxy = '*';

        // 使用 spawn 时，参数数组会被正确传递，不需要手动加引号
        // 但为了确保在 Windows 上正确处理包含 % 的参数，我们明确指定 shell: false
        const pythonProcess = spawn(engine.command, args, {
            shell: false,  // 明确指定不使用 shell，避免 % 等特殊字符被解析
            stdio: ['pipe', 'pipe', 'pipe'],
            env: env  // 使用清理后的环境变量
        });
        currentPythonProcess = pythonProcess;

        let outputData = '';
        let errorData = '';
        let isResolved = false;

        // 设置超时（根据文本长度动态调整）
        // 短文本（<500字）：2分钟
        // 中等文本（500-1000字）：5分钟
        // 长文本（>1000字）：10分钟
        const textLength = safeText.replace(/<[^>]+>/g, '').length;
        let timeout;
        if (textLength < 500) {
            timeout = 2 * 60 * 1000; // 2 分钟
        } else if (textLength < 1000) {
            timeout = 5 * 60 * 1000; // 5 分钟
        } else {
            timeout = 10 * 60 * 1000; // 10 分钟
        }

        const timeoutId = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                pythonProcess.kill(); // 强制终止进程
                console.error(`[TTS] Python 进程超时（${timeout / 1000 / 60}分钟），已终止，文本长度: ${textLength} 字符`);
                reject(new Error(`TTS生成超时：处理时间超过${timeout / 1000 / 60}分钟，文本长度: ${textLength} 字符，请尝试缩短文本或分段处理`));
            }
        }, timeout);

        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const errorText = data.toString();
            errorData += errorText;
            // 实时输出错误信息，方便调试
            console.error('[TTS] Python stderr:', errorText);
        });

        pythonProcess.stdout.on('data', (data) => {
            const outputText = data.toString();
            outputData += outputText;
            // 实时输出标准输出，方便调试
            console.log('[TTS] Python stdout:', outputText);
        });

        pythonProcess.on('close', (code) => {
            currentPythonProcess = null;
            clearTimeout(timeoutId);
            if (isResolved) return; // 如果已经超时处理，不再处理关闭事件
            if (cancelRequested) {
                isResolved = true;
                reject(new Error('GenerationCancelled'));
                return;
            }

            console.log(`[TTS] Python 进程退出，代码: ${code}`);
            console.log(`[TTS] 标准输出 (完整):`, outputData);
            console.log(`[TTS] 错误输出 (完整):`, errorData);
            console.log(`[TTS] 标准输出 (前500字符): ${outputData.substring(0, 500)}`);
            console.log(`[TTS] 错误输出 (前500字符): ${errorData.substring(0, 500)}`);

            if (code === 0) {
                // 检查输出中是否有成功标记
                if (outputData.includes('SUCCESS:')) {
                    isResolved = true;
                    const successMatch = outputData.match(/SUCCESS:(.+)/);
                    if (successMatch) {
                        const actualPath = successMatch[1].trim();
                        console.log(`[TTS] 音频生成成功: ${actualPath}`);
                        resolve(actualPath);
                    } else {
                        resolve(outputPath);
                    }
                } else {
                    // 虽然退出码是0，但没看到成功标记，可能只有警告
                    console.warn('[TTS] Python 进程成功退出但无标准输出，假设成功');
                    isResolved = true;
                    resolve(outputPath);
                }
            } else {
                isResolved = true;
                // 检查是否是模块缺失错误
                if (errorData.includes('ModuleNotFoundError') || errorData.includes('No module named')) {
                    console.error(`[TTS] Python 模块缺失错误 (代码 ${code}): ${errorData}`);
                    reject(new Error(`TTS生成失败: Python 模块缺失。请确保 tts_wrapper.exe 已正确打包。错误详情: ${errorData.substring(0, 500)}`));
                } else if (errorData.includes('NoAudioReceived') || errorData.includes('ERROR:')) {
                    // 提取详细的错误信息
                    const errorMatch = errorData.match(/ERROR:([^\n]+)/);
                    const errorMessage = errorMatch ? errorMatch[1].trim() : errorData.substring(0, 500);
                    console.error(`[TTS] Python TTS 生成失败 (代码 ${code}):`, {
                        errorMessage,
                        fullError: errorData,
                        output: outputData,
                        textLength: safeText.length,
                        textPreview: safeText.substring(0, 100),
                        voice: safeVoice,
                        rate: safeRate,
                        volume: safeVolume,
                        pitch: safePitch
                    });
                    reject(new Error(`TTS生成失败: ${errorMessage || errorData.substring(0, 500)}`));
                } else {
                    console.error(`[TTS] Python 进程失败 (代码 ${code}):`, {
                        errorData,
                        outputData,
                        textLength: safeText.length,
                        textPreview: safeText.substring(0, 100)
                    });
                    reject(new Error(`TTS生成失败: ${errorData || '未知错误'}`));
                }
            }
        });

        pythonProcess.on('error', (err) => {
            currentPythonProcess = null;
            clearTimeout(timeoutId);
            if (isResolved) return;
            isResolved = true;
            console.error('[TTS] 无法启动 Python 进程:', {
                error: err.message,
                code: err.code,
                command: engine.command,
                commandExists: fs.existsSync(engine.command),
                syscall: err.syscall
            });
            
            if (err.code === 'ENOENT') {
                reject(new Error(`无法启动 TTS 引擎: 找不到文件 "${engine.command}"。请确保 tts_wrapper.exe 已正确打包到 resources 目录。`));
            } else {
                reject(new Error(`无法启动 TTS 引擎: ${err.message}`));
            }
        });
    });
}

/**
 * 转换语速参数
 * @param {number} speed - 0.5-2.0
 * @returns {string} Edge TTS 格式 (+50%)
 */
function convertRate(speed) {
    // 确保 speed 是有效数字
    const safeSpeed = (typeof speed === 'number' && !isNaN(speed)) ? speed : 1.0;
    const rate = Math.round((safeSpeed - 1.0) * 100);
    return rate >= 0 ? `+${rate}%` : `${rate}%`;
}

/**
 * 转换音调参数
 * @param {number} pitch - 0.5-2.0
 * @returns {string} Edge TTS 格式 (+0Hz)
 */
function convertPitch(pitch) {
    // 确保 pitch 是有效数字
    const safePitch = (typeof pitch === 'number' && !isNaN(pitch)) ? pitch : 1.0;
    const hz = Math.round((safePitch - 1.0) * 50); // 放大到 +/- 50Hz，音调变化更明显
    return hz >= 0 ? `+${hz}Hz` : `${hz}Hz`;
}

/**
 * 转换音量参数
 * @param {number} volume - 0-1
 * @returns {string} Edge TTS 格式 (+0%)
 */
function convertVolume(volume) {
    // 确保 volume 是有效数字
    const safeVolume = (typeof volume === 'number' && !isNaN(volume)) ? volume : 1.0;
    const vol = Math.round((safeVolume - 1.0) * 100);
    return vol >= 0 ? `+${vol}%` : `${vol}%`;
}

const REREAD_SPEED_FACTOR = 0.75;
const REREAD_VOLUME_FACTOR = 1.35;

function clampPauseMs(ms) {
    const parsed = parseInt(ms, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(parsed, 10000));
}

/**
 * 将数字标记的拼音转换为带声调符号的拼音
 */
function convertPinyinWithTone(pinyinWithNumber) {
    const toneMap = {
        'a': ['ā', 'á', 'ǎ', 'à', 'a'],
        'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
        'e': ['ē', 'é', 'ě', 'è', 'e'],
        'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
        'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
        'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
        'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
    };

    const match = pinyinWithNumber.match(/^([a-zü]+?)(\d)$/);
    if (!match) return pinyinWithNumber;

    const basePinyin = match[1];
    const tone = parseInt(match[2], 10);

    if (tone === 5 || tone === 0 || tone < 1 || tone > 5) return basePinyin;

    let charToChange = '';
    let indexToChange = -1;

    if (basePinyin.includes('a')) {
        charToChange = 'a';
        indexToChange = basePinyin.indexOf('a');
    } else if (basePinyin.includes('o')) {
        charToChange = 'o';
        indexToChange = basePinyin.indexOf('o');
    } else if (basePinyin.includes('e')) {
        charToChange = 'e';
        indexToChange = basePinyin.indexOf('e');
    } else if (basePinyin.includes('iu')) {
        charToChange = 'u';
        indexToChange = basePinyin.indexOf('u');
    } else if (basePinyin.includes('ui')) {
        charToChange = 'i';
        indexToChange = basePinyin.indexOf('i');
    } else {
        for (let i = basePinyin.length - 1; i >= 0; i--) {
            const char = basePinyin[i];
            if (toneMap[char]) {
                charToChange = char;
                indexToChange = i;
                break;
            }
        }
    }

    if (indexToChange === -1 || !toneMap[charToChange]) return basePinyin;

    const tonedChar = toneMap[charToChange][tone - 1];
    return basePinyin.substring(0, indexToChange) + tonedChar + basePinyin.substring(indexToChange + 1);
}

/**
 * 将长文本分段，避免超过 edge-tts 的单次请求限制
 * @param {string} text - 要分段的文本（可能包含 SSML 标签）
 * @param {number} maxLength - 每段最大字符数（纯文本，不包括标签）
 * @param {boolean} isSSML - 是否是 SSML 格式
 * @returns {string[]} 分段后的文本数组
 */
function splitTextIntoSegments(text, maxLength, isSSML) {
    // 如果文本长度在限制内，直接返回
    const cleanTextLength = text.replace(/<[^>]+>/g, '').length;
    if (cleanTextLength <= maxLength) {
        return [text];
    }

    // 如果是 SSML 格式，先移除外层的 <speak> 和 </speak> 标签，分段后再重新添加
    let textToSplit = text;
    if (isSSML) {
        // 移除开头的 <speak> 或 <speak ...>
        textToSplit = textToSplit.replace(/^<speak[^>]*>/, '');
        // 移除结尾的 </speak>
        textToSplit = textToSplit.replace(/<\/speak>$/, '');
    }

    const segments = [];
    let currentPos = 0;
    const textLength = textToSplit.length;

    while (currentPos < textLength) {
        // 计算剩余文本的纯文本长度
        const remainingText = textToSplit.substring(currentPos);
        const remainingCleanLength = remainingText.replace(/<[^>]+>/g, '').length;

        // 如果剩余文本在限制内，直接作为最后一段
        if (remainingCleanLength <= maxLength) {
            if (remainingText.trim()) {
                segments.push(remainingText.trim());
            }
            break;
        }

        // 寻找最佳分割点（在标点符号处）
        // 注意：这里需要基于纯文本长度来估算位置，但实际分割是在包含标签的文本上
        // 为了简化，我们直接在当前文本上查找，但计算长度时排除标签
        let estimatedSplitPos = currentPos;
        let cleanCharCount = 0;
        let i = currentPos;
        while (i < textLength && cleanCharCount < maxLength) {
            if (textToSplit[i] === '<') {
                // 跳过整个标签
                const tagEnd = textToSplit.indexOf('>', i);
                if (tagEnd !== -1) {
                    i = tagEnd + 1;
                } else {
                    i++;
                }
            } else {
                cleanCharCount++;
                i++;
            }
        }
        let splitPos = i;
        const searchStart = Math.max(currentPos, splitPos - 200); // 向前搜索最多 200 字符
        const searchEnd = Math.min(textLength, splitPos + 200); // 向后搜索最多 200 字符

        // 优先在句号、问号、感叹号处分割
        let bestSplitPos = -1;
        const sentenceEndings = /[。！？\n]/;
        for (let i = searchEnd - 1; i >= searchStart; i--) {
            if (sentenceEndings.test(textToSplit[i])) {
                // 确保不在标签内
                const beforePos = textToSplit.lastIndexOf('<', i);
                const afterPos = textToSplit.indexOf('>', i);
                if (beforePos === -1 || afterPos === -1 || beforePos > i || afterPos < i) {
                    bestSplitPos = i + 1;
                    break;
                }
            }
        }

        // 如果没有找到句号，尝试在逗号、分号处分割
        if (bestSplitPos === -1) {
            const commaEndings = /[，；、]/;
            for (let i = searchEnd - 1; i >= searchStart; i--) {
                if (commaEndings.test(textToSplit[i])) {
                    const beforePos = textToSplit.lastIndexOf('<', i);
                    const afterPos = textToSplit.indexOf('>', i);
                    if (beforePos === -1 || afterPos === -1 || beforePos > i || afterPos < i) {
                        bestSplitPos = i + 1;
                        break;
                    }
                }
            }
        }

        // 如果还是没找到，尝试在空格处分割
        if (bestSplitPos === -1) {
            for (let i = searchEnd - 1; i >= searchStart; i--) {
                if (/\s/.test(textToSplit[i])) {
                    const beforePos = textToSplit.lastIndexOf('<', i);
                    const afterPos = textToSplit.indexOf('>', i);
                    if (beforePos === -1 || afterPos === -1 || beforePos > i || afterPos < i) {
                        bestSplitPos = i + 1;
                        break;
                    }
                }
            }
        }

        // 如果仍然没找到，确保不在标签中间分割
        if (bestSplitPos === -1) {
            bestSplitPos = splitPos;
            // 向前查找，确保不在标签内
            let tagStart = textToSplit.lastIndexOf('<', bestSplitPos);
            let tagEnd = textToSplit.indexOf('>', tagStart);
            if (tagStart !== -1 && tagEnd !== -1 && tagStart < bestSplitPos && tagEnd >= bestSplitPos) {
                // 如果在标签内，移动到标签结束之后
                bestSplitPos = tagEnd + 1;
            }
        }

        // 提取当前段
        const segment = textToSplit.substring(currentPos, bestSplitPos).trim();
        if (segment) {
            // 如果是 SSML 格式，每段都需要用 <speak> 标签包裹
            if (isSSML) {
                segments.push(`<speak>${segment}</speak>`);
            } else {
                segments.push(segment);
            }
        }

        currentPos = bestSplitPos;
    }

    return segments.length > 0 ? segments : [text];
}

/**
 * 预处理所有Edge TTS不支持的SSML标记
 */
function preprocessSSMLTags(text) {
    let result = text;

    // 规范化换行符：将多个连续的换行符替换为单个空格，避免 edge-tts 处理失败
    // 但保留单个换行符（可能是有意的段落分隔），将其转换为空格
    result = result.replace(/\n{3,}/g, ' '); // 3个或更多换行符 -> 单个空格
    result = result.replace(/\n{2}/g, ' ');   // 2个换行符 -> 单个空格
    result = result.replace(/\n/g, ' ');       // 单个换行符 -> 单个空格
    // 清理多个连续空格
    result = result.replace(/\s{2,}/g, ' '); // 多个空格 -> 单个空格
    // 清理前后的空白字符
    result = result.trim();

    // 0. 移除发音人标记（只保留内容），因为发音人标记已经在分段处理时使用了
    result = result.replace(/<voice\s+voice_id=["'][^"']+["'](?:\s+voice_name=["'][^"']*["'])?(?:\s+voice_avatar=["'][^"']*["'])?>([\s\S]*?)<\/voice>/g, (match, content) => {
        return content; // 只保留标签内的内容
    });

    // 1. 处理停顿标记，保留为真实 SSML 停顿时长
    result = result.replace(/<pause\s+ms=["'](\d+)["']\s*\/>/g, (match, ms) => {
        const pauseMs = clampPauseMs(ms);
        return pauseMs > 0 ? `<break time="${pauseMs}ms"/>` : '';
    });

    // 2. 处理数字读法标记
    result = result.replace(/<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g, (match, mode, numStr) => {
        try {
            return numberConverter.convertNumber(numStr.trim(), mode);
        } catch (error) {
            console.error('[TTS] 数字转换失败:', error);
            return numStr;
        }
    });

    // 3. 移除旧的 repeat 标记
    result = result.replace(/<repeat\s+times=["']\d+["']\s*\/>/g, '');

    // 4. 处理多音字标记
    result = result.replace(/<polyphone\s+pronunciation=["']([^"']+)["']\s*>([\s\S]*?)<\/polyphone>/g, (match, pronunciation, content) => {
        return convertPinyinWithTone(pronunciation);
    });

    // 5. 移除速度标记（只保留内容），因为速度标记已经在分段处理时使用了
    result = result.replace(/<speed\s+rate=["'][^"']+["']>([\s\S]*?)<\/speed>/g, (match, content) => {
        return content; // 只保留标签内的内容
    });

    // 6. 移除重读标记（只保留内容），因为重读标记已经在分段处理时使用了
    result = result.replace(/<reread>([\s\S]*?)<\/reread>/g, (match, content) => {
        return content; // 只保留标签内的内容
    });

    return result;
}


/**
 * 解析文本中的音效标记
 */
function parseSoundEffectSegments(text) {
    const segments = [];
    const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
    let lastIndex = 0;
    let match;

    while ((match = soundRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const normalText = text.slice(lastIndex, match.index).trim();
            if (normalText) segments.push({ type: 'text', text: normalText });
        }
        segments.push({ type: 'sound', effectId: match[1] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex).trim();
        if (remainingText) segments.push({ type: 'text', text: remainingText });
    }

    if (segments.length === 0 && text.trim()) {
        segments.push({ type: 'text', text: text.trim() });
    }

    return segments;
}

/**
 * 检查文本是否只包含标点符号和空白字符
 * @param {string} text - 要检查的文本
 * @returns {boolean} 如果只包含标点符号返回 true
 */
function isOnlyPunctuation(text) {
    if (!text || text.trim().length === 0) return true;
    // 使用 Unicode 属性检查：\p{P} 匹配所有标点符号，\p{Z} 匹配所有空白字符
    return /^[\s\p{P}\p{Z}]+$/u.test(text.trim());
}

/**
 * 解析文本中的发音人标记
 * @param {string} text - 包含 <voice> 标签的文本
 * @returns {Array} 分段数组，每个分段包含 text 和 voiceId
 */
function parseVoiceSegments(text) {
    const segments = [];
    const voiceRegex = /<voice\s+voice_id=["']([^"']+)["'](?:\s+voice_name=["'][^"']*["'])?(?:\s+voice_avatar=["'][^"']*["'])?>([\s\S]*?)<\/voice>/g;
    let lastIndex = 0;
    let match;

    while ((match = voiceRegex.exec(text)) !== null) {
        // 添加标签之前的文本（如果有）
        if (match.index > lastIndex) {
            const normalText = text.slice(lastIndex, match.index).trim();
            if (normalText && !isOnlyPunctuation(normalText)) {
                segments.push({ text: normalText, voiceId: null }); // null 表示使用默认发音人
            } else if (normalText && isOnlyPunctuation(normalText)) {
                // 如果只包含标点符号，尝试合并到前一个分段
                if (segments.length > 0) {
                    segments[segments.length - 1].text += normalText;
                } else {
                    // 如果没有前一个分段，仍然添加（后续会在处理时跳过）
                    segments.push({ text: normalText, voiceId: null });
                }
            }
        }

        // 添加 voice 标签内的文本
        const voiceId = match[1];
        const voiceText = match[2].trim();
        if (voiceText && !isOnlyPunctuation(voiceText)) {
            segments.push({ text: voiceText, voiceId: voiceId });
        } else if (voiceText && isOnlyPunctuation(voiceText)) {
            // 如果只包含标点符号，尝试合并到前一个分段
            if (segments.length > 0) {
                segments[segments.length - 1].text += voiceText;
            } else {
                // 如果没有前一个分段，仍然添加（后续会在处理时跳过）
                segments.push({ text: voiceText, voiceId: voiceId });
            }
        }

        lastIndex = match.index + match[0].length;
    }

    // 添加最后剩余的文本（如果有）
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex).trim();
        if (remainingText && !isOnlyPunctuation(remainingText)) {
            segments.push({ text: remainingText, voiceId: null }); // null 表示使用默认发音人
        } else if (remainingText && isOnlyPunctuation(remainingText)) {
            // 如果只包含标点符号，尝试合并到前一个分段
            if (segments.length > 0) {
                segments[segments.length - 1].text += remainingText;
            } else {
                // 如果没有前一个分段，仍然添加（后续会在处理时跳过）
                segments.push({ text: remainingText, voiceId: null });
            }
        }
    }

    // 如果没有找到任何 voice 标签，返回整个文本
    if (segments.length === 0 && text.trim()) {
        segments.push({ text: text.trim(), voiceId: null });
    }

    return segments;
}

/**
 * 解析文本中的速度标记
 */
function parseSpeedSegments(text, defaultSpeed = 1.0) {
    console.log('[TTS] ========== parseSpeedSegments 开始 ==========');
    console.log('[TTS] 输入文本长度:', text.length);
    console.log('[TTS] 输入文本预览:', text.substring(0, 200));
    console.log('[TTS] 默认速度:', defaultSpeed);

    const segments = [];
    const speedRegex = /<speed\s+rate=["']([^"']+)["']>(.*?)<\/speed>/gs;
    let lastIndex = 0;
    let match;
    let speedMatchCount = 0;

    while ((match = speedRegex.exec(text)) !== null) {
        speedMatchCount++;
        console.log(`[TTS] --- 处理第 ${speedMatchCount} 个变速标记 ---`);
        console.log('[TTS] 变速标记位置:', match.index, '到', match.index + match[0].length);
        console.log('[TTS] 变速标记完整内容:', match[0].substring(0, 100));

        if (match.index > lastIndex) {
            const normalText = text.slice(lastIndex, match.index).trim();
            if (normalText) {
                console.log('[TTS] 变速标记前的普通文本:', normalText.substring(0, 50));
                segments.push({ text: normalText, speed: defaultSpeed });
            }
        }

        const speed = parseFloat(match[1]) || defaultSpeed;
        const speedText = match[2].trim();
        console.log('[TTS] 解析到的变速值:', speed);
        console.log('[TTS] 变速标记内的文本:', speedText.substring(0, 50));

        if (speedText) {
            segments.push({ text: speedText, speed: speed });
            console.log('[TTS] 添加变速分段:', {
                text: speedText.substring(0, 30),
                speed: speed
            });
        }

        lastIndex = match.index + match[0].length;
    }

    console.log('[TTS] 找到的变速标记总数:', speedMatchCount);

    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex).trim();
        if (remainingText) {
            console.log('[TTS] 添加剩余文本分段:', remainingText.substring(0, 50));
            segments.push({ text: remainingText, speed: defaultSpeed });
        }
    }

    if (segments.length === 0 && text.trim()) {
        console.log('[TTS] 没有找到变速标记，使用整个文本');
        segments.push({ text: text.trim(), speed: defaultSpeed });
    }

    console.log('[TTS] 最终分段数量:', segments.length);
    for (let i = 0; i < segments.length; i++) {
        console.log(`[TTS] 分段 ${i + 1}:`, {
            text: segments[i].text.substring(0, 30),
            speed: segments[i].speed
        });
    }

    console.log('[TTS] ========== parseSpeedSegments 结束 ==========');
    return segments;
}

/**
 * 解析文本中的重读标记（支持嵌套的变速标记）
 */
function parseRereadSegments(text, config) {
    console.log('[TTS] ========== parseRereadSegments 开始 ==========');
    console.log('[TTS] 输入文本长度:', text.length);
    console.log('[TTS] 输入文本预览:', text.substring(0, 200));

    const segments = [];
    const rereadRegex = /<reread>([\s\S]*?)<\/reread>/g;
    let lastIndex = 0;
    let match;

    // 确保 config 有有效值
    const safeConfig = config || {};
    const safeSpeed = (typeof safeConfig.speed === 'number' && !isNaN(safeConfig.speed)) ? safeConfig.speed : 1.0;
    const safeVolume = (typeof safeConfig.volume === 'number' && !isNaN(safeConfig.volume)) ? safeConfig.volume : 1.0;

    const normalRate = convertRate(safeSpeed);
    const normalVolume = convertVolume(safeVolume);

    console.log('[TTS] parseRereadSegments 配置:', {
        speed: safeSpeed,
        volume: safeVolume,
        normalRate,
        normalVolume
    });

    // 检查文本中是否包含变速标记
    const hasSpeedTags = /<speed\s+rate=["'][^"']+["']>/.test(text);
    console.log('[TTS] 文本中是否包含变速标记:', hasSpeedTags);
    if (hasSpeedTags) {
        const speedMatches = text.match(/<speed\s+rate=["']([^"']+)["']>/g);
        console.log('[TTS] 找到的变速标记:', speedMatches);
    }

    let rereadMatchCount = 0;
    while ((match = rereadRegex.exec(text)) !== null) {
        rereadMatchCount++;
        console.log(`[TTS] --- 处理第 ${rereadMatchCount} 个重读标记 ---`);
        console.log('[TTS] 重读标记位置:', match.index, '到', match.index + match[0].length);

        if (match.index > lastIndex) {
            const normalText = text.slice(lastIndex, match.index).trim();
            if (normalText) {
                console.log('[TTS] 重读标记前的普通文本:', normalText.substring(0, 50));
                // 检查普通文本中是否包含变速标记
                const hasSpeedInNormal = /<speed\s+rate=["'][^"']+["']>/.test(normalText);
                console.log('[TTS] 普通文本中是否包含变速标记:', hasSpeedInNormal);

                if (hasSpeedInNormal) {
                    // 如果包含变速标记，递归处理
                    console.log('[TTS] 开始解析普通文本中的变速标记...');
                    const speedSegments = parseSpeedSegments(normalText, safeSpeed);
                    console.log('[TTS] 普通文本中的变速分段数量:', speedSegments.length);
                    for (let j = 0; j < speedSegments.length; j++) {
                        console.log(`[TTS] 普通文本变速分段 ${j + 1}:`, {
                            text: speedSegments[j].text.substring(0, 30),
                            speed: speedSegments[j].speed,
                            rate: convertRate(speedSegments[j].speed)
                        });
                        segments.push({
                            text: speedSegments[j].text,
                            rate: convertRate(speedSegments[j].speed),
                            volume: normalVolume
                        });
                    }
                } else {
                    console.log('[TTS] 普通文本无变速标记，使用默认速度');
                    segments.push({
                        text: normalText,
                        rate: normalRate,
                        volume: normalVolume
                    });
                }
            }
        }

        const rereadText = match[1].trim();
        console.log('[TTS] 重读标记内的文本:', rereadText.substring(0, 100));

        if (rereadText) {
            // 检查重读文本中是否包含变速标记
            const hasSpeedInReread = /<speed\s+rate=["'][^"']+["']>/.test(rereadText);
            console.log('[TTS] 重读文本中是否包含变速标记:', hasSpeedInReread);

            if (hasSpeedInReread) {
                // 如果重读文本中包含变速标记，需要分别处理每个变速分段
                console.log('[TTS] 开始解析重读文本中的变速标记...');
                const speedMatches = rereadText.match(/<speed\s+rate=["']([^"']+)["']>/g);
                console.log('[TTS] 重读文本中找到的变速标记:', speedMatches);

                const speedSegments = parseSpeedSegments(rereadText, safeSpeed);
                console.log('[TTS] 重读文本中的变速分段数量:', speedSegments.length);

                for (let j = 0; j < speedSegments.length; j++) {
                    console.log(`[TTS] 重读文本变速分段 ${j + 1} 原始信息:`, {
                        text: speedSegments[j].text.substring(0, 30),
                        originalSpeed: speedSegments[j].speed
                    });

                    // 对每个变速分段应用重读效果（速度降低10%，音量增加10%）
                    const emphasizedSpeed = Math.max(speedSegments[j].speed * REREAD_SPEED_FACTOR, 0.1);
                    const emphasizedVolume = safeVolume * REREAD_VOLUME_FACTOR;
                    const rereadRate = convertRate(emphasizedSpeed);
                    const rereadVolume = convertVolume(emphasizedVolume);

                    console.log('[TTS] 重读+变速文本处理结果:', {
                        text: speedSegments[j].text.substring(0, 30),
                        originalSpeed: speedSegments[j].speed,
                        emphasizedSpeed: emphasizedSpeed,
                        emphasizedVolume: emphasizedVolume,
                        rereadRate: rereadRate,
                        rereadVolume: rereadVolume,
                        finalRate: rereadRate,
                        finalVolume: rereadVolume
                    });

                    segments.push({
                        text: speedSegments[j].text,
                        rate: rereadRate,
                        volume: rereadVolume
                    });
                }
            } else {
                // 普通重读（不包含变速）
                console.log('[TTS] 重读文本不包含变速标记，应用普通重读效果');
                const emphasizedSpeed = Math.max(safeSpeed * REREAD_SPEED_FACTOR, 0.1);
                const emphasizedVolume = safeVolume * REREAD_VOLUME_FACTOR;
                const rereadRate = convertRate(emphasizedSpeed);
                const rereadVolume = convertVolume(emphasizedVolume);

                console.log('[TTS] 普通重读文本处理结果:', {
                    text: rereadText.substring(0, 30),
                    originalSpeed: safeSpeed,
                    emphasizedSpeed: emphasizedSpeed,
                    emphasizedVolume: emphasizedVolume,
                    rereadRate: rereadRate,
                    rereadVolume: rereadVolume
                });

                segments.push({
                    text: rereadText,
                    rate: rereadRate,
                    volume: rereadVolume
                });
            }
        }

        lastIndex = match.index + match[0].length;
    }

    console.log('[TTS] 找到的重读标记总数:', rereadMatchCount);

    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex).trim();
        console.log('[TTS] 处理剩余文本，长度:', remainingText.length);
        if (remainingText) {
            // 检查剩余文本中是否包含变速标记
            const hasSpeedInRemaining = /<speed\s+rate=["'][^"']+["']>/.test(remainingText);
            console.log('[TTS] 剩余文本中是否包含变速标记:', hasSpeedInRemaining);

            if (hasSpeedInRemaining) {
                console.log('[TTS] 开始解析剩余文本中的变速标记...');
                const speedSegments = parseSpeedSegments(remainingText, safeSpeed);
                console.log('[TTS] 剩余文本中的变速分段数量:', speedSegments.length);
                for (let j = 0; j < speedSegments.length; j++) {
                    console.log(`[TTS] 剩余文本变速分段 ${j + 1}:`, {
                        text: speedSegments[j].text.substring(0, 30),
                        speed: speedSegments[j].speed,
                        rate: convertRate(speedSegments[j].speed)
                    });
                    segments.push({
                        text: speedSegments[j].text,
                        rate: convertRate(speedSegments[j].speed),
                        volume: normalVolume
                    });
                }
            } else {
                console.log('[TTS] 剩余文本无变速标记，使用默认速度');
                segments.push({
                    text: remainingText,
                    rate: normalRate,
                    volume: normalVolume
                });
            }
        }
    }

    if (segments.length === 0 && text.trim()) {
        console.log('[TTS] 没有找到任何分段，使用整个文本');
        segments.push({
            text: text.trim(),
            rate: normalRate,
            volume: normalVolume
        });
    }

    // 验证所有 segment 都有有效的 rate 和 volume
    console.log('[TTS] 最终分段数量:', segments.length);
    for (let i = 0; i < segments.length; i++) {
        if (!segments[i].rate || !segments[i].volume) {
            console.warn('[TTS] Segment', i, '缺少 rate 或 volume:', segments[i]);
            segments[i].rate = segments[i].rate || normalRate;
            segments[i].volume = segments[i].volume || normalVolume;
        }
        console.log(`[TTS] 分段 ${i + 1} 最终信息:`, {
            text: segments[i].text.substring(0, 30),
            rate: segments[i].rate,
            volume: segments[i].volume
        });
    }

    console.log('[TTS] ========== parseRereadSegments 结束 ==========');
    return segments;
}


/**
 * 将文本转换为适合 edge-tts 的格式
 * 如果包含 <break> 标签，使用最简单的 SSML 格式；否则使用纯文本
 * @param {string} text - 处理后的文本
 * @param {string} voiceName - 发音人名称（仅用于日志）
 * @param {string} rate - 语速（如 +50%）
 * @param {string} volume - 音量（如 +0%）
 * @param {string} pitch - 音调（如 +0Hz）
 * @returns {object} {text: 文本或SSML, isSSML: 是否是SSML格式}
 */
function prepareTextForTTS(text, voiceName, rate, volume, pitch) {
    // 检查文本中是否包含 SSML 标签（如 <break>）
    const hasSSMLTags = /<break\s+time=["']\d+ms["']\s*\/>/.test(text);

    if (hasSSMLTags) {
        // 使用最简单的 SSML 格式：只用 <speak> 包装，保留 <break> 标签
        // 不使用 <voice> 和 <prosody>，因为这些信息通过参数传递
        // 这样可以避免 edge-tts 无法识别 SSML 的问题
        return {
            text: `<speak>${text}</speak>`,
            isSSML: true
        };
    } else {
        // 如果没有 SSML 标签，直接返回纯文本
        return {
            text: text,
            isSSML: false
        };
    }
}

/**
 * 使用 FFmpeg 拼接多个音频文件
 */
function concatenateAudioFiles(audioPaths, outputPath) {
    return new Promise((resolve, reject) => {
        if (audioPaths.length === 0) {
            reject(new Error('没有音频文件可拼接'));
            return;
        }

        if (audioPaths.length === 1) {
            fs.copyFileSync(audioPaths[0], outputPath);
            resolve(outputPath);
            return;
        }

        const listFilePath = outputPath.replace('.mp3', '_list.txt');
        const fileListContent = audioPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(listFilePath, fileListContent, 'utf-8');

        ffmpeg()
            .input(listFilePath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .audioCodec('libmp3lame')
            .audioBitrate(192)
            .on('end', () => {
                try {
                    if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
                    audioPaths.forEach(p => {
                        if (p.includes('_seg') || p.includes('_sound')) {
                            if (fs.existsSync(p)) fs.unlinkSync(p);
                        }
                    });
                } catch (err) { }
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[TTS] 音频拼接失败:', err);
                try { if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath); } catch (e) { }
                reject(new Error(`音频拼接失败: ${err.message}`));
            })
            .save(outputPath);
    });
}

/**
 * 生成真实音频文件 (使用 Python 后端)
 */
/**
 * 生成纯语音音频 (不含背景音乐)
 * @param {string} text - 要转换的文本
 * @param {object} config - TTS 配置
 * @param {function} onProgress - 进度回调函数 (current, total, segmentText)
 */
async function generateSpeech(text, config, onProgress) {
    ensureNotCancelled();
    // 首先清理文本前后的空白字符，避免发送给 edge-tts 时出现问题
    text = (text && typeof text === 'string') ? text.trim() : '';
    if (!text) {
        throw new Error('文本内容为空');
    }

    console.log('[TTS] generateAudio called with text:', text.substring(0, 100));
    const outputDir = getAudioCacheDir();
    const timestamp = Date.now();
    const fileName = `tts_${text.length}_${timestamp}`;
    const outputBase = path.join(outputDir, fileName);
    const finalPath = `${outputBase}.mp3`;

    const voiceName = VOICE_MAPPING[config.voice_id] || 'zh-CN-XiaoxiaoNeural';

    try {
        const hasVoiceTags = /<voice\s+voice_id=["'][^"']+["']/.test(text);
        const hasSoundEffects = /<sound\s+effect=["'][^"']+["']\s*\/>/.test(text);
        const hasRereadTags = /<reread>/.test(text);
        const hasSpeedTags = /<speed\s+rate=["'][^"']+["']>/.test(text);

        console.log('[TTS] ========== generateSpeech 开始处理 ==========');
        console.log('[TTS] 文本长度:', text.length);
        console.log('[TTS] 文本预览:', text.substring(0, 300));
        console.log('[TTS] 标记检测结果:', {
            hasVoiceTags,
            hasSoundEffects,
            hasRereadTags,
            hasSpeedTags
        });

        if (hasRereadTags) {
            const rereadMatches = text.match(/<reread>/g);
            console.log('[TTS] 找到的重读标记数量:', rereadMatches ? rereadMatches.length : 0);
        }

        if (hasSpeedTags) {
            const speedMatches = text.match(/<speed\s+rate=["'][^"']+["']>/g);
            console.log('[TTS] 找到的变速标记数量:', speedMatches ? speedMatches.length : 0);
            if (speedMatches) {
                console.log('[TTS] 变速标记详情:', speedMatches);
            }
        }

        // 0. 处理发音人标记 (最高优先级，因为需要分段使用不同发音人)
        if (hasVoiceTags) {
            console.log('[TTS] 使用发音人分段处理');
            const segments = parseVoiceSegments(text);
            const segmentPaths = [];
            const totalSegments = segments.length;

            // 发送初始进度更新
            if (onProgress) {
                onProgress(0, totalSegments, '');
            }

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentPath = `${outputBase}_seg${i}.mp3`;

                // 确定使用的发音人
                const segmentVoiceId = segment.voiceId || config.voice_id;
                const segmentVoiceName = VOICE_MAPPING[segmentVoiceId] || VOICE_MAPPING[config.voice_id] || 'zh-CN-XiaoxiaoNeural';

                // 递归处理分段文本（可能包含其他标记）
                const segmentConfig = {
                    ...config,
                    voice_id: segmentVoiceId
                };

                // 确保分段文本中不包含 voice 标签（避免递归时再次处理或被朗读）
                // 移除所有 voice 标签，只保留内容
                let cleanSegmentText = segment.text;
                cleanSegmentText = cleanSegmentText.replace(/<voice\s+voice_id=["'][^"']+["'](?:\s+voice_name=["'][^"']*["'])?(?:\s+voice_avatar=["'][^"']*["'])?>([\s\S]*?)<\/voice>/g, '$1');
                // 清理前后的空白字符（包括换行符），避免发送给 edge-tts 时出现问题
                cleanSegmentText = cleanSegmentText.trim();

                // 检查分段文本长度
                const segmentCleanLength = cleanSegmentText.replace(/<[^>]+>/g, '').length;
                console.log(`[TTS] 发音人分段 ${i + 1}/${totalSegments}，文本长度: ${segmentCleanLength} 字符`);

                // 检查是否为空或只包含标点符号
                const cleanTextOnly = cleanSegmentText.replace(/<[^>]+>/g, '').trim();
                const isOnlyPunctuation = cleanTextOnly.length > 0 && /^[\s\p{P}\p{Z}]+$/u.test(cleanTextOnly);
                
                if (segmentCleanLength === 0 || isOnlyPunctuation) {
                    console.warn(`[TTS] 发音人分段 ${i + 1} 为空或只包含标点符号（"${cleanTextOnly}"），跳过`);
                    // 更新进度（即使跳过也更新）
                    if (onProgress) {
                        onProgress(i + 1, totalSegments, '');
                    }
                    continue;
                }

                // 创建包装的进度回调，用于递归调用
                const segmentProgressCallback = onProgress ? (current, total, segmentText) => {
                    // 对于递归调用，我们只关心当前分段是否完成
                    // 这里简化处理：当递归完成时，更新主进度
                } : null;

                // 递归调用 generateSpeech 处理分段（会自动处理长文本分段）
                const segPath = await generateSpeech(cleanSegmentText, segmentConfig, segmentProgressCallback);
                const tempPath = `${outputBase}_seg${i}.mp3`;
                if (fs.existsSync(segPath)) {
                    fs.copyFileSync(segPath, tempPath);
                    segmentPaths.push(tempPath);
                }

                // 更新进度
                if (onProgress) {
                    onProgress(i + 1, totalSegments, cleanSegmentText.replace(/<[^>]+>/g, '').substring(0, 30));
                }
            }

            await concatenateAudioFiles(segmentPaths, finalPath);
            return finalPath;
        }

        // 1. 处理音效
        if (hasSoundEffects) {
            console.log('[TTS] 使用音效分段处理');
            const segments = parseSoundEffectSegments(text);
            const segmentPaths = [];

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                if (segment.type === 'sound') {
                    let soundEffectPath;
                    const isCustom = segment.effectId.startsWith('custom_');

                    if (app.isPackaged) {
                        // 生产环境
                        if (isCustom) {
                            const fileName = segment.effectId.replace('custom_', '');
                            soundEffectPath = path.join(app.getAppPath(), 'dist', 'sounds', 'custom', fileName);
                        } else {
                            soundEffectPath = path.join(app.getAppPath(), 'dist', 'sounds', 'effects', `${segment.effectId}.mp3`);
                        }
                    } else {
                        // 开发环境
                        if (isCustom) {
                            const fileName = segment.effectId.replace('custom_', '');
                            soundEffectPath = path.join(__dirname, '..', 'public', 'sounds', 'custom', fileName);
                        } else {
                            soundEffectPath = path.join(__dirname, '..', 'public', 'sounds', 'effects', `${segment.effectId}.mp3`);
                        }
                    }

                    if (fs.existsSync(soundEffectPath)) {
                        const tempPath = `${outputBase}_sound${i}.mp3`;
                        fs.copyFileSync(soundEffectPath, tempPath);
                        segmentPaths.push(tempPath);
                    } else {
                        console.warn(`[TTS] 音效文件缺失: ${soundEffectPath}`);
                    }
                } else {
                    // 检查文本长度
                    const textCleanLength = segment.text.replace(/<[^>]+>/g, '').length;
                    console.log(`[TTS] 音效分段 ${i + 1}（文本），长度: ${textCleanLength} 字符`);

                    if (textCleanLength === 0) {
                        console.warn(`[TTS] 音效分段 ${i + 1} 文本为空，跳过`);
                        continue;
                    }

                    // 创建包装的进度回调（音效分段不显示详细进度，只显示整体进度）
                    const segmentProgressCallback = null; // 音效分段不传递进度回调，避免重复更新

                    // 递归调用 generateSpeech 处理分段（会自动处理长文本分段）
                    const segPath = await generateSpeech(segment.text, config, segmentProgressCallback);
                    const tempPath = `${outputBase}_seg${i}.mp3`;
                    if (fs.existsSync(segPath)) {
                        fs.copyFileSync(segPath, tempPath);
                        segmentPaths.push(tempPath);
                    }
                }
            }

            await concatenateAudioFiles(segmentPaths, finalPath);
            return finalPath;
        }

        // 2. 处理重读和变速标记（如果同时存在，优先处理重读，但会识别嵌套的变速）
        if (hasRereadTags || hasSpeedTags) {
            // 如果同时存在重读和变速标记，使用组合处理
            if (hasRereadTags && hasSpeedTags) {
                console.log('[TTS] ========== 使用重读+变速组合分段处理 ==========');
                console.log('[TTS] 开始调用 parseRereadSegments...');
                const segments = parseRereadSegments(text, config);
                console.log('[TTS] parseRereadSegments 返回的分段数量:', segments.length);

                if (segments.length === 0) {
                    console.error('[TTS] 错误：parseRereadSegments 返回了空数组！');
                }

                const segmentPaths = [];
                const totalSegments = segments.length;

                // 发送初始进度更新
                if (onProgress) {
                    onProgress(0, totalSegments, '');
                }

                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const segmentPath = `${outputBase}_seg${i}.mp3`;

                    // 确保 rate 和 volume 有有效值
                    const safeRate = segment.rate || convertRate(config.speed || 1.0);
                    const safeVolume = segment.volume || convertVolume(config.volume !== undefined ? config.volume : 1.0);

                    console.log('[TTS] ========== 处理重读+变速分段', i + 1, '/', totalSegments, '==========');
                    console.log('[TTS] 分段文本:', segment.text.substring(0, 100));
                    console.log('[TTS] 分段 rate:', safeRate, '(原始:', segment.rate, ')');
                    console.log('[TTS] 分段 volume:', safeVolume, '(原始:', segment.volume, ')');
                    console.log('[TTS] 配置 speed:', config.speed);
                    console.log('[TTS] 配置 volume:', config.volume);

                    const processedText = preprocessSSMLTags(segment.text);
                    const processedCleanLength = processedText.replace(/<[^>]+>/g, '').trim().length;
                    if (processedCleanLength === 0) {
                        console.warn('[TTS] 分段文本预处理后为空，跳过该分段');
                        if (onProgress) {
                            const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                            onProgress(i + 1, totalSegments, segmentPreview);
                        }
                        continue;
                    }
                    console.log('[TTS] 预处理后的文本:', processedText.substring(0, 100));

                    const pitch = convertPitch(config.pitch || 1.0);

                    // 使用辅助函数处理文本，确保 <break> 标签被正确处理
                    const { text: textToSend } = prepareTextForTTS(
                        processedText,
                        voiceName,
                        safeRate,
                        safeVolume,
                        pitch
                    );

                    console.log('[TTS] 准备发送给 TTS 的文本:', textToSend.substring(0, 100));
                    console.log('[TTS] 准备发送给 TTS 的参数:', {
                        voiceName,
                        rate: safeRate,
                        volume: safeVolume,
                        pitch
                    });

                    await generateAudioWithPython(
                        textToSend,
                        voiceName,
                        safeRate,
                        safeVolume,
                        pitch,
                        segmentPath
                    );

                    console.log('[TTS] 分段', i + 1, '生成完成，文件路径:', segmentPath);
                    segmentPaths.push(segmentPath);

                    // 更新进度
                    if (onProgress) {
                        const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                        onProgress(i + 1, totalSegments, segmentPreview);
                    }
                }

                console.log('[TTS] 所有分段生成完成，开始拼接音频...');
                console.log('[TTS] 分段文件列表:', segmentPaths);
                await concatenateAudioFiles(segmentPaths, finalPath);
                console.log('[TTS] 音频拼接完成，最终文件:', finalPath);
                console.log('[TTS] ========== 重读+变速组合处理完成 ==========');
                return finalPath;
            } else if (hasRereadTags) {
                // 只有重读标记
                console.log('[TTS] 使用重读分段处理');
                const segments = parseRereadSegments(text, config);
                console.log('[TTS] 重读分段数量:', segments.length);
                const segmentPaths = [];
                const totalSegments = segments.length;

                // 发送初始进度更新
                if (onProgress) {
                    onProgress(0, totalSegments, '');
                }

                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const segmentPath = `${outputBase}_seg${i}.mp3`;

                    // 确保 rate 和 volume 有有效值
                    const safeRate = segment.rate || convertRate(config.speed || 1.0);
                    const safeVolume = segment.volume || convertVolume(config.volume !== undefined ? config.volume : 1.0);

                    console.log('[TTS] 重读分段', i, ':', {
                        text: segment.text.substring(0, 50),
                        rate: safeRate,
                        volume: safeVolume
                    });

                    const processedText = preprocessSSMLTags(segment.text);
                    const processedCleanLength = processedText.replace(/<[^>]+>/g, '').trim().length;
                    if (processedCleanLength === 0) {
                        console.warn('[TTS] 重读分段文本预处理后为空，跳过该分段');
                        if (onProgress) {
                            const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                            onProgress(i + 1, totalSegments, segmentPreview);
                        }
                        continue;
                    }
                    const pitch = convertPitch(config.pitch || 1.0);

                    // 使用辅助函数处理文本，确保 <break> 标签被正确处理
                    const { text: textToSend } = prepareTextForTTS(
                        processedText,
                        voiceName,
                        safeRate,
                        safeVolume,
                        pitch
                    );

                    await generateAudioWithPython(
                        textToSend,
                        voiceName,
                        safeRate,
                        safeVolume,
                        pitch,
                        segmentPath
                    );
                    segmentPaths.push(segmentPath);

                    // 更新进度
                    if (onProgress) {
                        const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                        onProgress(i + 1, totalSegments, segmentPreview);
                    }
                }

                await concatenateAudioFiles(segmentPaths, finalPath);
                return finalPath;
            } else if (hasSpeedTags) {
                // 只有变速标记
                console.log('[TTS] 使用速度分段处理');
                const segments = parseSpeedSegments(text, config.speed || 1.0);
                const segmentPaths = [];
                const totalSegments = segments.length;

                // 发送初始进度更新
                if (onProgress) {
                    onProgress(0, totalSegments, '');
                }

                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const segmentPath = `${outputBase}_seg${i}.mp3`;

                    const processedText = preprocessSSMLTags(segment.text);
                    const processedCleanLength = processedText.replace(/<[^>]+>/g, '').trim().length;
                    if (processedCleanLength === 0) {
                        console.warn('[TTS] 变速分段文本预处理后为空，跳过该分段');
                        if (onProgress) {
                            const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                            onProgress(i + 1, totalSegments, segmentPreview);
                        }
                        continue;
                    }
                    const rate = convertRate(segment.speed);
                    const pitch = convertPitch(config.pitch || 1.0);
                    const volume = convertVolume(config.volume !== undefined ? config.volume : 1.0);

                    // 使用辅助函数处理文本，确保 <break> 标签被正确处理
                    const { text: textToSend } = prepareTextForTTS(
                        processedText,
                        voiceName,
                        rate,
                        volume,
                        pitch
                    );

                    await generateAudioWithPython(
                        textToSend,
                        voiceName,
                        rate,
                        volume,
                        pitch,
                        segmentPath
                    );
                    segmentPaths.push(segmentPath);

                    // 更新进度
                    if (onProgress) {
                        const segmentPreview = segment.text.replace(/<[^>]+>/g, '').substring(0, 30);
                        onProgress(i + 1, totalSegments, segmentPreview);
                    }
                }

                await concatenateAudioFiles(segmentPaths, finalPath);
                return finalPath;
            }
        }

        // 4. 普通模式
        const processedText = preprocessSSMLTags(text);
        const rate = convertRate(config.speed || 1.0);
        const pitch = convertPitch(config.pitch || 1.0);
        const volume = convertVolume(config.volume !== undefined ? config.volume : 1.0);

        // 使用辅助函数处理文本，确保 <break> 标签被正确处理
        const { text: textToSend, isSSML } = prepareTextForTTS(
            processedText,
            voiceName,
            rate,
            volume,
            pitch
        );

        // 检查文本长度，如果超过 1000 字符，进行分段处理
        // edge-tts 对单次请求的文本长度有限制，长文本可能导致失败
        const MAX_CHUNK_LENGTH = 1000; // 每段最大字符数（保守估计）
        const cleanTextLength = textToSend.replace(/<[^>]+>/g, '').length; // 去除标签后的纯文本长度

        if (cleanTextLength > MAX_CHUNK_LENGTH) {
            console.log(`[TTS] 文本过长 (${cleanTextLength} 字符)，进行分段处理`);
            const segments = splitTextIntoSegments(textToSend, MAX_CHUNK_LENGTH, isSSML);
            console.log(`[TTS] 已分成 ${segments.length} 段，开始并发生成...`);
            
            // 发送初始进度更新
            if (onProgress) {
                onProgress(0, segments.length, '');
            }
            
            // 根据文本长度动态调整并发数
            let concurrency;
            if (cleanTextLength < 2000) {
                concurrency = 2; // 短文本：2 个并发
            } else if (cleanTextLength < 5000) {
                concurrency = 3; // 中等文本：3 个并发
            } else {
                concurrency = 5; // 长文本：5 个并发（上限）
            }
            console.log(`[TTS] 并发数: ${concurrency}`);

            // 并发控制：使用简单的队列机制
            const segmentPaths = [];
            const failedSegments = [];
            let completedCount = 0;
            const totalSegments = segments.length;

            // 创建并发处理函数
            const processSegment = async (segment, index) => {
                const segmentPath = `${outputBase}_chunk${index}.mp3`;
                const segmentLength = segment.replace(/<[^>]+>/g, '').length;
                const segmentPreview = segment.replace(/<[^>]+>/g, '').substring(0, 30);

                console.log(`[TTS] [${index + 1}/${totalSegments}] 开始处理分段，长度: ${segmentLength} 字符`);

                try {
                    await generateAudioWithPython(
                        segment,
                        voiceName,
                        rate,
                        volume,
                        pitch,
                        segmentPath
                    );

                    // 验证文件是否成功生成
                    if (fs.existsSync(segmentPath) && fs.statSync(segmentPath).size > 0) {
                        segmentPaths[index] = segmentPath; // 保持顺序
                        completedCount++;
                        console.log(`[TTS] [${index + 1}/${totalSegments}] 分段生成成功`);
                        
                        // 调用进度回调
                        if (onProgress) {
                            console.log(`[TTS] 调用进度回调: ${completedCount}/${totalSegments}`);
                            onProgress(completedCount, totalSegments, segmentPreview);
                        } else {
                            console.warn('[TTS] 进度回调未设置');
                        }
                    } else {
                        throw new Error(`分段 ${index + 1} 生成的音频文件无效`);
                    }
                } catch (error) {
                    console.error(`[TTS] [${index + 1}/${totalSegments}] 分段生成失败:`, error);
                    failedSegments.push({ index: index + 1, error: error.message });

                    // 清理失败的临时文件
                    try {
                        if (fs.existsSync(segmentPath)) {
                            fs.unlinkSync(segmentPath);
                        }
                    } catch (cleanupError) {
                        console.warn(`[TTS] 清理临时文件失败:`, cleanupError);
                    }

                    completedCount++;
                    // 调用进度回调（即使失败也更新进度）
                    if (onProgress) {
                        console.log(`[TTS] 调用进度回调（失败）: ${completedCount}/${totalSegments}`);
                        onProgress(completedCount, totalSegments, segmentPreview);
                    } else {
                        console.warn('[TTS] 进度回调未设置（失败情况）');
                    }
                }
            };

            // 并发处理：使用 Promise 队列控制并发数
            const processWithConcurrency = async () => {
                const tasks = segments.map((segment, i) => () => processSegment(segment, i));
                const running = [];
                let taskIndex = 0;

                while (taskIndex < tasks.length || running.length > 0) {
                    // 启动新任务直到达到并发上限
                    while (taskIndex < tasks.length && running.length < concurrency) {
                        const task = tasks[taskIndex++];
                        const promise = Promise.resolve(task()).finally(() => {
                            // 从运行队列中移除
                            const index = running.indexOf(promise);
                            if (index > -1) {
                                running.splice(index, 1);
                            }
                        });
                        running.push(promise);
                    }

                    // 等待至少一个任务完成
                    if (running.length > 0) {
                        await Promise.race(running);
                    }
                }
            };

            // 执行并发处理
            await processWithConcurrency();

            // 检查是否有足够的分段可以拼接
            const validSegments = segmentPaths.filter(p => p !== undefined);
            if (validSegments.length === 0) {
                throw new Error('所有分段都生成失败，无法生成音频');
            }

            // 如果失败的分段太多（超过30%），放弃整个任务
            if (failedSegments.length > segments.length * 0.3) {
                // 清理已生成的分段文件
                validSegments.forEach(p => {
                    try {
                        if (fs.existsSync(p)) fs.unlinkSync(p);
                    } catch (e) { }
                });
                throw new Error(`分段处理失败过多（${failedSegments.length}/${segments.length}），已放弃。失败原因: ${failedSegments.map(s => `分段${s.index}: ${s.error}`).join('; ')}`);
            }

            if (failedSegments.length > 0) {
                console.warn(`[TTS] 警告: ${failedSegments.length} 个分段生成失败，将使用 ${validSegments.length} 个成功分段进行拼接`);
            }

            console.log(`[TTS] 开始拼接 ${validSegments.length} 个音频分段...`);
            await concatenateAudioFiles(validSegments, finalPath);
            console.log(`[TTS] 音频拼接完成: ${finalPath}`);
            return finalPath;
        } else {
            console.log('[TTS] 发送给 Python 的文本:', textToSend.substring(0, 200));
            await generateAudioWithPython(textToSend, voiceName, rate, volume, pitch, finalPath);
            return finalPath;
        }

    } catch (error) {
        console.error('[TTS] python TTS 生成失败:', error);
        throw error;
    }
}

/**
 * 生成带背景音乐的完整音频 (对外接口)
 * @param {string} text - 要转换的文本
 * @param {object} config - TTS 配置
 * @param {function} onProgress - 进度回调函数 (current, total, segmentText)
 */
async function generateAudio(text, config, onProgress) {
    resetCancelFlag();
    ensureNotCancelled();
    // 1. 生成语音音频
    console.log('[TTS] 开始生成语音...');
    const speechPath = await generateSpeech(text, config, onProgress);

    // 2. 如果包含背景音乐，进行混合
    // 检查 bgmPath 是否存在且有效
    console.log('[TTS] ========== 检查背景音乐配置 ==========');
    console.log('[TTS] 配置信息:', {
        hasBgmPath: !!config.bgmPath,
        bgmPath: config.bgmPath,
        bgmPathType: typeof config.bgmPath,
        bgmVolume: config.bgmVolume,
        speechPath: speechPath,
        speechPathExists: fs.existsSync(speechPath)
    });

    if (config.bgmPath && typeof config.bgmPath === 'string') {
        let bgmPath = config.bgmPath;
        console.log(`[TTS] 背景音乐路径（原始）: ${bgmPath}`);
        console.log(`[TTS] 背景音乐文件是否存在: ${fs.existsSync(bgmPath)}`);
        
        // 如果文件不存在，尝试使用 getResourcePath 解析路径
        if (!fs.existsSync(bgmPath)) {
            // 尝试从路径中提取相对路径（如 'sounds/bgm/upbeat.mp3'）
            const relativePathMatch = bgmPath.match(/sounds\/.*$/);
            if (relativePathMatch) {
                const relativePath = relativePathMatch[0];
                const resolvedPath = getResourcePath(relativePath);
                console.log(`[TTS] 尝试解析资源路径: ${relativePath} -> ${resolvedPath}`);
                if (fs.existsSync(resolvedPath)) {
                    bgmPath = resolvedPath;
                    console.log(`[TTS] ✅ 找到背景音乐文件: ${bgmPath}`);
                }
            }
        }
        
        // 检查文件是否存在
        if (fs.existsSync(bgmPath)) {
            const bgmStats = fs.statSync(bgmPath);
            console.log(`[TTS] ✅ 检测到背景音乐: ${bgmPath}`);
            console.log(`[TTS] 背景音乐文件信息:`, {
                size: bgmStats.size,
                isFile: bgmStats.isFile(),
                volume: config.bgmVolume !== undefined ? config.bgmVolume : 0.3
            });
            
            try {
                // 混音 options: bgmVolume 来自 config.bgmVolume, voiceVolume 保持 1.0 (因为语音已经处理过音量)
                // mixBackgroundMusic 内部已实现 loop=-1 和 duration=first (截断到语音长度)
                const mixedPath = await mixBackgroundMusic(speechPath, bgmPath, {
                    bgmVolume: config.bgmVolume !== undefined ? config.bgmVolume : 0.3,
                    voiceVolume: 1.0
                });
                console.log('[TTS] ✅ 背景音乐混合完成:', mixedPath);
                return mixedPath;
            } catch (error) {
                console.error('[TTS] ❌ 背景音乐混合失败，将返回原始语音:', {
                    error: error.message,
                    stack: error.stack,
                    bgmPath: bgmPath,
                    speechPath: speechPath
                });
                return speechPath;
            }
        } else {
            console.warn(`[TTS] ⚠️ 背景音乐文件不存在: ${bgmPath}，跳过混音`);
            console.warn(`[TTS] 当前工作目录: ${process.cwd()}`);
            console.warn(`[TTS] App 路径: ${app.getAppPath()}`);
            console.warn(`[TTS] Resources 路径: ${process.resourcesPath}`);
            
            // 尝试查找可能的路径
            const possiblePaths = [
                bgmPath,
                getResourcePath(bgmPath.replace(/^.*sounds\//, 'sounds/')),
                path.join(app.getAppPath(), 'dist', bgmPath.replace(/^.*sounds\//, 'sounds/')),
                path.join(__dirname, '..', 'public', bgmPath.replace(/^.*sounds\//, 'sounds/')),
                path.join(process.resourcesPath, bgmPath.replace(/^.*sounds\//, 'sounds/'))
            ];
            
            console.warn(`[TTS] 尝试查找的路径:`, possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })));
        }
    } else {
        console.log('[TTS] 未配置背景音乐，跳过混音');
    }

    return speechPath;
}

/**
 * 计算音频预计时长 (秒)
 */
function calculateDuration(text, speed = 1.0) {
    const cleanedText = text.replace(/<[^>]+>/g, '');
    const charCount = cleanedText.length;
    const wordsPerMinute = 250 * speed;
    const baseDuration = (charCount / wordsPerMinute) * 60;

    const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
    let totalPauseMs = 0;
    let match;
    while ((match = pauseRegex.exec(text)) !== null) {
        totalPauseMs += parseInt(match[1], 10);
    }

    return Math.ceil(baseDuration + (totalPauseMs / 1000));
}

/**
 * 获取可用发音人列表
 */
/**
 * 获取发音人列表
 * 返回 edge-tts 支持的所有免费中文发音人（共14个）
 */
function getVoiceList() {
    return [
        // ========== 中国大陆标准发音人（6个） ==========
        {
            id: 'zhiwei',
            name: '云希 (男)',
            gender: 'male',
            language: 'zh-CN',
            description: '活泼灵动，阳光、活泼、富有朝气。适合动画旁白、短视频讲解、小说中的少年角色、轻松的教学视频',
            originalId: 'zh-CN-YunxiNeural'
        },
        {
            id: 'xiaoyu',
            name: '晓晓 (女)',
            gender: 'female',
            language: 'zh-CN',
            description: '全能情感，音质温婉、亲切、自然，支持多种情绪。适合有声小说、影视解说、情感类电台、客服机器人、长文本阅读',
            originalId: 'zh-CN-XiaoxiaoNeural'
        },
        {
            id: 'xiaofeng',
            name: '云野 (男)',
            gender: 'male',
            language: 'zh-CN',
            description: '专业稳重，雄浑、专业、有磁性，接近传统广播电台的新闻主播。适合新闻播报、纪录片旁白、企业宣传片、严肃的学术讲座、时政解说',
            originalId: 'zh-CN-YunyangNeural'
        },
        {
            id: 'xiaomei',
            name: '晓伊 (女)',
            gender: 'female',
            language: 'zh-CN',
            description: '温柔甜美，声音清脆、甜美、有礼貌，像专业的服务人员或知心大姐姐。适合在线客服、语音助理、儿童故事、商场广播、生活贴士提醒',
            originalId: 'zh-CN-XiaoyiNeural'
        },
        {
            id: 'yunjian',
            name: '云健 (男)',
            gender: 'male',
            language: 'zh-CN',
            description: '激情澎湃，语速较快，充满力量感和运动感，声音亢奋极具感染力。适合体育赛事解说、竞技类游戏解说、促销广告、短视频中的"咆哮式"旁白',
            originalId: 'zh-CN-YunjianNeural'
        },
        {
            id: 'yunxia',
            name: '云霞 (女/儿童)',
            gender: 'female',
            language: 'zh-CN',
            description: '可爱童真，稚嫩、纯真、可爱，典型的儿童声线。适合幼儿教育、儿童绘本朗读、动画片低幼角色、萌宠视频配音',
            originalId: 'zh-CN-YunxiaNeural'
        },

        // ========== 中国大陆方言发音人（2个） ==========
        {
            id: 'xiaobei',
            name: '晓北 (女) [东北话]',
            gender: 'female',
            language: 'zh-CN-liaoning',
            description: '豪爽、幽默、接地气，自带东北人特有的幽默感和感染力，听起来非常亲切。适合搞笑段子、生活类 Vlog、东北地区背景的故事叙述、极具辨识度的带货直播',
            originalId: 'zh-CN-liaoning-XiaobeiNeural'
        },
        {
            id: 'xiaoni',
            name: '晓妮 (女) [陕西话]',
            gender: 'female',
            language: 'zh-CN-shaanxi',
            description: '淳朴、敦厚、有韵味，能够体现出西北地区的风土人情，情感饱满且富有力量。适合历史文化介绍（如西安旅游）、地方特色美食推广、反映西北农村生活的影视解说',
            originalId: 'zh-CN-shaanxi-XiaoniNeural'
        },

        // ========== 香港发音人（3个） ==========
        {
            id: 'wanlong',
            name: '云龙 (男) [香港]',
            gender: 'male',
            language: 'zh-HK',
            description: '成熟、稳重、商务感，语调带有典型的港式精英气质，发音标准且专业。适合金融资讯播报、企业宣传片、港式商战剧解说',
            originalId: 'zh-HK-WanLungNeural'
        },
        {
            id: 'hiugaai',
            name: '晓佳 (女) [香港粤语]',
            gender: 'female',
            language: 'zh-HK',
            description: '柔和、知性、地道，这是非常标准的粤语发音，语感自然。适合粤语地区新闻、电台主持、生活百科',
            originalId: 'zh-HK-HiuGaaiNeural'
        },
        {
            id: 'hiumaan',
            name: '晓曼 (女) [香港]',
            gender: 'female',
            language: 'zh-HK',
            description: '优雅、从容、有书卷气，相比晓佳，她的声音听起来更像是一个博学、沉静的演讲者。适合有声书朗读、纪录片旁白、高端品牌广告',
            originalId: 'zh-HK-HiuMaanNeural'
        },

        // ========== 台湾发音人（3个） ==========
        {
            id: 'yunjhe',
            name: '云哲 (男) [台湾]',
            gender: 'male',
            language: 'zh-TW',
            description: '温柔、儒雅、"奶系"感，典型的台湾男生发音，语调平缓，没有攻击性。适合治愈系短视频、青春偶像剧解说、情感类电台、生活贴士提醒',
            originalId: 'zh-TW-YunJheNeural'
        },
        {
            id: 'hsiaochen',
            name: '晓辰 (女) [台湾]',
            gender: 'female',
            language: 'zh-TW',
            description: '甜美、阳光、富有活力，听起来像是一位充满朝气的邻家女孩，非常讨喜。适合娱乐资讯、综艺旁白、年轻化的 Vlog、早起闹钟',
            originalId: 'zh-TW-HsiaoChenNeural'
        },
        {
            id: 'hsiaoyu',
            name: '晓语 (女) [台湾]',
            gender: 'female',
            language: 'zh-TW',
            description: '专业、清晰、知性，这是典型的"台湾国语"主播风格，咬字清晰，非常有亲和力。适合教育类视频、在线课程讲解、智能语音助理、正式场合的语音引导',
            originalId: 'zh-TW-HsiaoYuNeural'
        },
    ];
}

/**
 * 混音等辅助函数保持不变，为节省空间这里仅提供骨架，实际部署时需要完整
 */
async function exportAudio(sourcePath, targetPath, format = 'mp3') {
    if (!fs.existsSync(sourcePath)) throw new Error(`源文件不存在: ${sourcePath}`);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    if (format.toLowerCase() === 'mp3') {
        await fs.promises.copyFile(sourcePath, targetPath);
        return targetPath;
    } else {
        return new Promise((resolve, reject) => {
            ffmpeg(sourcePath).toFormat('wav')
                .on('end', () => resolve(targetPath))
                .on('error', (err) => reject(err))
                .save(targetPath);
        });
    }
}

async function mixBackgroundMusic(voicePath, bgmPath, options = {}) {
    console.log('[TTS] ========== mixBackgroundMusic 开始 ==========');
    console.log('[TTS] 参数:', {
        voicePath,
        bgmPath,
        options,
        voicePathExists: fs.existsSync(voicePath),
        bgmPathExists: fs.existsSync(bgmPath)
    });

    // 检查文件是否存在
    if (!fs.existsSync(voicePath)) {
        const error = new Error(`语音文件不存在: ${voicePath}`);
        console.error('[TTS] ❌ 错误:', error.message);
        throw error;
    }

    if (!fs.existsSync(bgmPath)) {
        const error = new Error(`背景音乐文件不存在: ${bgmPath}`);
        console.error('[TTS] ❌ 错误:', error.message);
        throw error;
    }

    // 检查文件大小
    const voiceStats = fs.statSync(voicePath);
    const bgmStats = fs.statSync(bgmPath);
    console.log('[TTS] 文件信息:', {
        voiceSize: voiceStats.size,
        bgmSize: bgmStats.size,
        voicePath: voicePath,
        bgmPath: bgmPath
    });

    const { bgmVolume = 0.3, voiceVolume = 1.0 } = options;
    const outputDir = getAudioCacheDir();
    const outputPath = path.join(outputDir, `mixed_${Date.now()}.mp3`);

    console.log('[TTS] 输出路径:', outputPath);
    console.log('[TTS] 混音参数:', {
        bgmVolume,
        voiceVolume
    });

    return new Promise((resolve, reject) => {
        const ffmpegProcess = ffmpeg()
            .input(voicePath)
            .input(bgmPath)
            .complexFilter([
                `[0:a]volume=${voiceVolume}[voice]`,
                `[1:a]volume=${bgmVolume},aloop=loop=-1:size=2e+09[bgm]`,
                `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]`
            ])
            .outputOptions(['-map', '[out]'])
            .audioCodec('libmp3lame')
            .audioBitrate(192)
            .on('start', (commandLine) => {
                console.log('[TTS] FFmpeg 命令:', commandLine);
            })
            .on('progress', (progress) => {
                console.log('[TTS] 混音进度:', progress);
            })
            .on('end', () => {
                console.log('[TTS] ✅ 背景音乐混合成功:', outputPath);
                if (fs.existsSync(outputPath)) {
                    const outputStats = fs.statSync(outputPath);
                    console.log('[TTS] 输出文件大小:', outputStats.size);
                }
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[TTS] ❌ 背景音乐混合失败:', {
                    error: err.message,
                    stack: err.stack,
                    voicePath,
                    bgmPath
                });
                reject(err);
            })
            .save(outputPath);
    });
}

/**
 * 导入文本文件（支持 txt、doc、docx）
 * @param {string} filePath - 文件路径
 * @returns {Promise<string>} 文件内容
 */
async function importTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
        // 直接读取文本文件
        return fs.promises.readFile(filePath, 'utf-8');
    } else if (ext === '.docx') {
        // 解析 docx 文件
        try {
            // 使用 mammoth 库解析 docx（需要安装：npm install mammoth）
            const mammoth = require('mammoth');

            // 使用 convertToHtml 而不是 extractRawText，因为：
            // 1. convertToHtml 默认忽略批注(comments)
            // 2. 对于脚注和尾注有更好的控制
            // 3. 可以更准确地提取文档的主要内容，避免隐藏内容膨胀字符数
            const result = await mammoth.convertToHtml({ path: filePath });

            // 提取HTML中的纯文本
            let text = result.value;

            // 移除所有HTML标签，保留文本内容
            // 先将 <br>, <br/>, <br /> 替换为换行符
            text = text.replace(/<br\s*\/?>/gi, '\n');
            // 将块级元素（p, div, h1-h6, li等）后添加换行符
            text = text.replace(/<\/(p|div|h[1-6]|li|tr|td|th)>/gi, '\n');
            // 移除所有剩余的HTML标签
            text = text.replace(/<[^>]+>/g, '');

            // HTML实体解码（处理常见的HTML实体）
            text = text.replace(/&nbsp;/g, ' ');
            text = text.replace(/&amp;/g, '&');
            text = text.replace(/&lt;/g, '<');
            text = text.replace(/&gt;/g, '>');
            text = text.replace(/&quot;/g, '"');
            text = text.replace(/&#39;/g, "'");
            text = text.replace(/&apos;/g, "'");

            // 移除零宽字符和控制字符
            text = text.replace(/[\u200B-\u200D\uFEFF\u00AD\u00A0]/g, '');

            // 将多个连续空白字符（空格、制表符）替换为单个空格
            text = text.replace(/[ \t]+/g, ' ');

            // 将多个连续换行符替换为最多两个换行符（保留段落分隔）
            text = text.replace(/\n{3,}/g, '\n\n');

            // 移除行首行尾的空白字符
            text = text.split('\n').map(line => line.trim()).join('\n');

            // 移除文本首尾的空白字符
            text = text.trim();

            console.log(`[TTS] DOCX 文件解析完成: ${filePath}`);
            console.log(`[TTS] 提取文本长度: ${text.length} 字符`);
            console.log(`[TTS] 文本预览（前100字符）: ${text.substring(0, 100)}`);

            return text;
        } catch (error) {
            console.error('[TTS] Docx 解析失败:', error);
            throw new Error(`无法解析 docx 文件: ${error.message}`);
        }
    } else if (ext === '.doc') {
        // doc 文件需要特殊处理，可以使用 antiword 或其他工具
        // 这里先提示用户转换为 docx
        throw new Error('暂不支持 .doc 格式，请将文件转换为 .docx 或 .txt 格式');
    } else {
        throw new Error(`不支持的文件格式: ${ext}`);
    }
}

async function exportProject(projectData, targetPath) {
    await fs.promises.writeFile(targetPath, JSON.stringify(projectData, null, 2), 'utf-8');
    return targetPath;
}

async function importProject(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
}

function getPresetBgmList() {
    // 使用 getResourcePath 获取正确的资源路径
    const bgmFiles = [
        { id: 'upbeat', name: '轻快节奏', fileName: 'upbeat.mp3', duration: 165 },
        { id: 'finding_myself', name: '寻找自我', fileName: 'finding myself.mp3', duration: 182 },
        { id: 'forest_walk', name: '森林漫步', fileName: 'forest walk.mp3', duration: 215 },
        { id: 'silent_descent', name: '静谧降落', fileName: 'silent-descent.mp3', duration: 198 },
        { id: 'smile', name: '微笑', fileName: 'smile.mp3', duration: 145 },
        { id: 'tears_of_joy', name: '喜悦之泪', fileName: 'tears of joy.mp3', duration: 176 },
        { id: 'valley_sunset', name: '山谷日落', fileName: 'valley sunset.mp3', duration: 204 },
    ];

    // 构建 BGM 列表，使用 getResourcePath 获取正确路径
    const bgmList = [
        { id: 'none', name: '无背景音乐', path: null, duration: 0 },
        ...bgmFiles.map(bgm => ({
            id: bgm.id,
            name: bgm.name,
            path: getResourcePath(path.join('sounds', 'bgm', bgm.fileName)),
            duration: bgm.duration
        }))
    ];

    // 调试日志：检查路径是否存在
    if (app.isPackaged) {
        console.log('[TTS] 生产环境 BGM 路径检查:');
        bgmList.forEach(bgm => {
            if (bgm.path) {
                console.log(`  ${bgm.name}: ${bgm.path} - ${fs.existsSync(bgm.path) ? '✅' : '❌'}`);
            }
        });
    }

    return bgmList;
}

module.exports = {
    generateAudio,
    cancelGenerateAudio,
    getVoiceList,
    calculateDuration,
    exportAudio,
    mixBackgroundMusic,
    importTextFile,
    exportProject,
    importProject,
    getPresetBgmList,
};
