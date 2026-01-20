/**
 * 文本处理工具函数
 */

/**
 * 获取纯文本字符数（排除所有 SSML 标记）
 * @param text 包含标记的文本
 * @returns 纯文本字符数
 */
export function getTextCharCount(text: string): number {
  if (!text) return 0;
  
  // 移除所有 SSML 标记
  // 匹配所有标签：<tag>...</tag> 或 <tag/>
  const cleanedText = text.replace(/<[^>]+>/g, '');
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

// 计算预计时长（秒）
// 假设平均语速：每分钟 200 字
// 停顿标记不计入字符数，但会增加时长
export function calculateDuration(text: string, speed: number = 1.0): number {
  // 获取纯文本字符数（排除标记）
  const charCount = getTextCharCount(text);
  
  // 计算基础时长（基于字符数）
  const wordsPerMinute = 200 * speed;
  const wordsPerSecond = wordsPerMinute / 60;
  const baseDuration = charCount / wordsPerSecond;
  
  // 加上停顿时长
  const pauseDuration = getPauseDuration(text);
  
  return Math.ceil(baseDuration + pauseDuration);
}

// 格式化时长为 HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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