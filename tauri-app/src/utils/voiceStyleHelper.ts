/**
 * 音色风格检索工具
 * 提供便捷的函数来查询和展示音色风格信息
 */

import { getVoiceStyle, searchVoicesByStyle, searchVoicesByScene, getAllVoiceStyles, getVoicesByGender, VoiceStyle } from '../config/voiceStyles';

/**
 * 检索当前音色对应的风格
 * @param voiceId 音色ID
 * @returns 风格信息对象，包含风格、适用场景和特点
 */
export function retrieveVoiceStyle(voiceId: string): {
  found: boolean;
  voice?: VoiceStyle;
  message: string;
} {
  const voice = getVoiceStyle(voiceId);
  
  if (!voice) {
    return {
      found: false,
      message: `未找到音色 "${voiceId}" 的风格信息`,
    };
  }

  return {
    found: true,
    voice,
    message: `音色 "${voice.name}" 的风格信息已找到`,
  };
}

/**
 * 格式化输出音色风格信息
 * @param voice 音色风格对象
 * @returns 格式化的字符串
 */
export function formatVoiceStyleInfo(voice: VoiceStyle): string {
  const lines = [
    `音色名称: ${voice.name}`,
    `风格: ${voice.style}`,
    `适用场景: ${voice.suitableFor.join('、')}`,
    `音色特点: ${voice.characteristics.join('、')}`,
  ];
  return lines.join('\n');
}

/**
 * 打印音色风格信息到控制台
 * @param voiceId 音色ID
 */
export function printVoiceStyle(voiceId: string): void {
  const result = retrieveVoiceStyle(voiceId);
  
  if (!result.found || !result.voice) {
    console.warn(result.message);
    return;
  }

  console.log('='.repeat(50));
  console.log(`音色风格信息: ${result.voice.name}`);
  console.log('='.repeat(50));
  console.log(formatVoiceStyleInfo(result.voice));
  console.log('='.repeat(50));
}

/**
 * 批量检索多个音色的风格
 * @param voiceIds 音色ID数组
 * @returns 风格信息数组
 */
export function retrieveMultipleVoiceStyles(voiceIds: string[]): Array<{
  voiceId: string;
  found: boolean;
  voice?: VoiceStyle;
}> {
  return voiceIds.map(voiceId => {
    const voice = getVoiceStyle(voiceId);
    return {
      voiceId,
      found: !!voice,
      voice: voice || undefined,
    };
  });
}

/**
 * 根据关键词检索相关音色
 * @param keyword 关键词
 * @returns 匹配的音色列表及详细信息
 */
export function searchVoices(keyword: string): {
  keyword: string;
  results: VoiceStyle[];
  count: number;
} {
  const results = searchVoicesByStyle(keyword);
  return {
    keyword,
    results,
    count: results.length,
  };
}

/**
 * 获取完整的音色风格报告
 * @param voiceId 音色ID（可选，如果不提供则返回所有音色）
 * @returns 格式化的报告字符串
 */
export function getVoiceStyleReport(voiceId?: string): string {
  if (voiceId) {
    const result = retrieveVoiceStyle(voiceId);
    if (!result.found || !result.voice) {
      return result.message;
    }
    return formatVoiceStyleInfo(result.voice);
  }

  // 返回所有音色的报告
  const allVoices = getAllVoiceStyles();
  const maleVoices = allVoices.filter(v => v.gender === 'male');
  const femaleVoices = allVoices.filter(v => v.gender === 'female');

  const lines = [
    '='.repeat(60),
    '音色风格完整报告',
    '='.repeat(60),
    '',
    `总计: ${allVoices.length} 个音色`,
    `  男性: ${maleVoices.length} 个`,
    `  女性: ${femaleVoices.length} 个`,
    '',
    '─'.repeat(60),
    '男性发音人',
    '─'.repeat(60),
    ...maleVoices.map(v => formatVoiceStyleInfo(v)),
    '',
    '─'.repeat(60),
    '女性发音人',
    '─'.repeat(60),
    ...femaleVoices.map(v => formatVoiceStyleInfo(v)),
    '',
    '='.repeat(60),
  ];

  return lines.join('\n');
}
