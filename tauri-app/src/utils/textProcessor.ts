/**
 * 文本处理工具函数
 */

/**
 * 获取纯文本字符数（排除所有 SSML 标记和空白字符）
 * @param text 包含标记的文本
 * @param excludeWhitespace 是否排除空白字符（空格、换行、制表符等），默认 false
 * @returns 纯文本字符数
 */
export function getTextCharCount(text: string, excludeWhitespace: boolean = false): number {
  if (!text) return 0;

  // 移除所有 SSML 标记
  // 匹配所有标签：<tag>...</tag> 或 <tag/>
  let cleanedText = text.replace(/<[^>]+>/g, '');

  // 如果排除空白字符，则移除所有空白字符
  if (excludeWhitespace) {
    cleanedText = cleanedText.replace(/\s/g, '');
  }

  return cleanedText.length;
}

/**
 * 提取所有停顿标记的时长（毫秒）
 * @param text 包含标记的文本
 * @returns 停顿总时长（秒）
 */
export function getPauseDuration(text: string): number {
  if (!text) return 0;

  const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
  let totalPauseMs = 0;
  let match;

  while ((match = pauseRegex.exec(text)) !== null) {
    const ms = parseInt(match[1], 10);
    totalPauseMs += ms;
  }

  // 转换为秒
  return totalPauseMs / 1000;
}

/**
 * 提取所有音效标记的时长（秒）
 * @param text 包含标记的文本
 * @returns 音效总时长（秒）
 */
function getSoundEffectDuration(text: string): number {
  if (!text) return 0;

  // 音效时长配置（毫秒）
  const soundDurations: Record<string, number> = {
    'applause': 2000,
    'laugh': 1500,
    'gasp': 500,
    'doorbell': 1000,
    'phone-ring': 2000,
    'knock': 1000,
    'notification': 500,
    'success': 1000,
    'warning': 1000,
  };

  const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
  let totalSoundMs = 0;
  let match;

  while ((match = soundRegex.exec(text)) !== null) {
    const effectId = match[1];
    const duration = soundDurations[effectId] || 1000; // 默认1秒
    totalSoundMs += duration;
  }

  // 转换为秒
  return totalSoundMs / 1000;
}

/**
 * 解析文本中的变速标记，分段计算时长
 * @param text 包含标记的文本
 * @param defaultSpeed 默认语速
 * @returns 总时长（秒）
 */
function calculateDurationWithSpeedSegments(text: string, defaultSpeed: number = 1.0): number {
  if (!text) return 0;

  // 基础语速：每分钟 250 字（根据 Edge TTS 实际测试调整）
  const baseWordsPerMinute = 250;

  // 解析变速标记，分段处理
  const speedRegex = /<speed\s+rate=["']([^"']+)["']>([\s\S]*?)<\/speed>/g;
  const segments: Array<{ text: string; speed: number }> = [];
  let lastIndex = 0;
  let match;

  while ((match = speedRegex.exec(text)) !== null) {
    // 添加标记之前的文本（使用默认语速）
    if (match.index > lastIndex) {
      const normalText = text.slice(lastIndex, match.index);
      if (normalText.trim()) {
        segments.push({ text: normalText, speed: defaultSpeed });
      }
    }

    // 添加变速标记内的文本
    const speed = parseFloat(match[1]) || defaultSpeed;
    const speedText = match[2];
    if (speedText.trim()) {
      segments.push({ text: speedText, speed: speed });
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加最后剩余的文本
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({ text: remainingText, speed: defaultSpeed });
    }
  }

  // 如果没有找到变速标记，使用整个文本
  if (segments.length === 0) {
    segments.push({ text: text, speed: defaultSpeed });
  }

  // 计算每段的时长
  let totalDuration = 0;
  for (const segment of segments) {
    // 检查该段是否有重读标记（重读会减慢语速，乘以0.9）
    const hasReread = /<reread>/.test(segment.text);
    const effectiveSpeed = hasReread ? segment.speed * 0.9 : segment.speed;

    // 移除该段文本中的所有标记，获取纯文本字符数
    const cleanText = segment.text.replace(/<[^>]+>/g, '');
    const charCount = cleanText.length;

    // 计算该段的时长（考虑该段的语速和重读影响）
    const wordsPerMinute = baseWordsPerMinute * effectiveSpeed;
    const wordsPerSecond = wordsPerMinute / 60;
    const segmentDuration = charCount / wordsPerSecond;

    totalDuration += segmentDuration;

    // 加上该段文本中的停顿时长
    const pauseDuration = getPauseDuration(segment.text);
    totalDuration += pauseDuration;

    // 加上该段文本中的音效时长
    const soundDuration = getSoundEffectDuration(segment.text);
    totalDuration += soundDuration;
  }

  return totalDuration;
}

/**
 * 计算预计时长（秒）
 * 考虑文本中的局部变速标记、停顿、重读等
 * @param text 包含标记的文本
 * @param speed 默认语速（0.5-2.0）
 * @returns 预计时长（秒）
 */
export function calculateDuration(text: string, speed: number = 1.0): number {
  if (!text) return 0;

  // 检查是否有变速标记
  const hasSpeedTags = /<speed\s+rate=["']([^"']+)["']>/.test(text);

  let rawDuration = 0;

  if (hasSpeedTags) {
    // 如果有变速标记，使用分段计算
    rawDuration = calculateDurationWithSpeedSegments(text, speed);
  } else {
    // 没有变速标记，使用简单计算
    const charCount = getTextCharCount(text);

    // 检查是否有重读标记（重读会减慢语速，乘以0.9）
    const hasReread = /<reread>/.test(text);
    const effectiveSpeed = hasReread ? speed * 0.9 : speed;

    // 基础语速：每分钟 300 字（根据实际播放时长校准）
    const wordsPerMinute = 300 * effectiveSpeed;
    const wordsPerSecond = wordsPerMinute / 60;
    const baseDuration = charCount / wordsPerSecond;

    // 加上停顿时长
    const pauseDuration = getPauseDuration(text);

    // 加上音效时长
    const soundDuration = getSoundEffectDuration(text);

    rawDuration = baseDuration + pauseDuration + soundDuration;
  }

  // 应用 TTS 引擎实际处理的时间调整系数（0.95）
  // 结合当前实际播放时长进行校准
  const adjustedDuration = rawDuration * 0.95;

  // 返回保留一位小数的时长（更精确）
  return Math.round(adjustedDuration * 10) / 10;
}

// 格式化时长为 HH:MM:SS
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '00:00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // 显示秒数，保留两位小数
  const secsFormatted = secs.toFixed(2);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secsFormatted.padStart(5, '0')}`;
}

/**
 * 获取音频文件时长（异步）
 * @param audioPath 音频文件路径或 URL
 * @returns 音频时长（秒），如果获取失败返回 0
 */
export function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve) => {
    if (!audioPath) {
      resolve(0);
      return;
    }

    const audio = new Audio();

    const handleLoadedMetadata = () => {
      const duration = audio.duration;
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      resolve(isFinite(duration) && !isNaN(duration) ? duration : 0);
    };

    const handleError = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      resolve(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    // 设置超时，避免长时间等待
    setTimeout(() => {
      if (audio.readyState === 0) {
        handleError();
      }
    }, 5000);

    audio.src = audioPath;
  });
}

/**
 * 将 BGM 路径转换为可用的 URL
 * 如果是相对路径（如 sounds/bgm/xxx.mp3），转换为完整 URL
 * 如果是绝对路径，转换为 media:// 协议 URL
 */
function convertBgmPathToUrl(bgmPath: string): string {
  if (!bgmPath) return '';

  // 如果是相对路径（不以 / 或盘符开头，如 C:）
  if (!bgmPath.match(/^([A-Za-z]:|\/)/)) {
    // 相对路径，假设在 public 目录下
    // 在开发环境中，使用 /public/ 前缀
    // 在生产环境中，可能需要不同的处理
    return `/${bgmPath}`;
  }

  // 绝对路径，在 Electron 环境中使用 media:// 协议
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    const normalizedPath = bgmPath.replace(/\\/g, '/');
    return `media:///${normalizedPath}`;
  }

  return bgmPath;
}

/**
 * 计算预计时长（秒），考虑背景音乐
 * 如果有 BGM，最终时长取语音时长和 BGM 时长的最大值
 * @param text 包含标记的文本
 * @param speed 默认语速（0.5-2.0）
 * @param bgmPath 背景音乐路径（可选）
 * @returns 预计时长（秒）
 */
export async function calculateDurationWithBGM(
  text: string,
  speed: number = 1.0,
  bgmPath: string | null = null
): Promise<number> {
  // 先计算语音时长
  const voiceDuration = calculateDuration(text, speed);

  // 如果没有 BGM，直接返回语音时长
  if (!bgmPath) {
    return voiceDuration;
  }

  // 将 BGM 路径转换为可用的 URL
  const bgmUrl = convertBgmPathToUrl(bgmPath);

  // 获取 BGM 时长
  const bgmDuration = await getAudioDuration(bgmUrl);

  // 如果有 BGM，最终时长取语音时长和 BGM 时长的最大值
  // 因为混音时，如果 BGM 更长会循环播放，如果语音更长 BGM 会循环
  return Math.max(voiceDuration, bgmDuration);
}

// 文本检测结果
export interface TextCheckResult {
  isValid: boolean;
  issues: string[];
  wordCount: number;
  charCount: number;
}

// 文本检测
export function checkText(text: string, maxLength: number = 5000): TextCheckResult {
  const issues: string[] = [];
  // 使用纯文本字符数（排除标记）
  const charCount = getTextCharCount(text);
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  // 检查长度
  if (charCount > maxLength) {
    issues.push(`文本超过最大长度限制（${maxLength}字）`);
  }

  // 检查是否为空
  if (charCount === 0) {
    issues.push('文本不能为空');
  }

  // 检查是否包含特殊字符（可选）
  // 这里可以根据需要添加更多检测规则

  return {
    isValid: issues.length === 0,
    issues,
    wordCount,
    charCount,
  };
}

// 复制文本到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

// 检测文本是否为中文
export function isChineseText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  // 移除空白字符和标点符号
  const cleanedText = text.replace(/[\s\p{P}]/gu, '');
  if (cleanedText.length === 0) return false;

  // 检测是否包含中文字符（CJK统一汉字）
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(cleanedText);
}

/**
 * 截断文本到指定最大长度
 * 优先在标点符号处截断，避免截断到句子中间
 * @param text 原始文本
 * @param maxLength 最大字符数（排除 SSML 标记）
 * @returns 截断后的文本和是否被截断的标志
 */
export function truncateText(text: string, maxLength: number): { text: string; wasTruncated: boolean; originalCharCount: number } {
  if (!text) {
    return { text: '', wasTruncated: false, originalCharCount: 0 };
  }

  const originalCharCount = getTextCharCount(text);
  
  // 如果文本长度未超过限制，直接返回
  if (originalCharCount <= maxLength) {
    return { text, wasTruncated: false, originalCharCount };
  }

  // 需要截断，从开头开始逐步截断
  // 优先在标点符号处截断（句号、问号、感叹号、分号、逗号等）
  const punctuationRegex = /[。！？；，、\n]/;
  
  // 二分查找合适的截断点
  let left = 0;
  let right = text.length;
  let bestPosition = 0;
  
  // 先尝试找到接近 maxLength 的位置
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const testText = text.substring(0, mid);
    const charCount = getTextCharCount(testText);
    
    if (charCount <= maxLength) {
      bestPosition = mid;
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  // 从 bestPosition 向前查找标点符号
  let truncatePosition = bestPosition;
  const searchRange = Math.min(100, bestPosition); // 最多向前查找100个字符
  for (let i = bestPosition - 1; i >= bestPosition - searchRange && i >= 0; i--) {
    if (punctuationRegex.test(text[i])) {
      truncatePosition = i + 1;
      break;
    }
  }
  
  // 如果找不到标点符号，直接截断到 bestPosition
  const truncatedText = text.substring(0, truncatePosition).trim();
  
  // 确保截断后的文本不超过限制
  let finalText = truncatedText;
  let finalCharCount = getTextCharCount(finalText);
  
  // 如果还是超过，继续截断（逐字符截断）
  while (finalCharCount > maxLength && finalText.length > 0) {
    finalText = finalText.substring(0, finalText.length - 1).trim();
    finalCharCount = getTextCharCount(finalText);
  }
  
  return {
    text: finalText,
    wasTruncated: true,
    originalCharCount
  };
}