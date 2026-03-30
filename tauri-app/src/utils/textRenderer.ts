/**
 * 文本渲染工具函数
 * 用于将包含标记的文本转换为可显示的 HTML
 */

import { getSoundEffectById } from '../config/soundEffects';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { t } from '../locales';

// const LINE_BREAK_TOKEN = '\u001F'; // Deprecated in favor of whitespace-pre-wrap

/**
 * 将停顿标记转换为可显示的格式
 * @param ms 停顿时长（毫秒）
 * @returns 格式化的时间字符串（如 "0.2s"）
 */
export function formatPauseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms / 1000}s`;
  } else {
    return `${ms / 1000}s`;
  }
}

/**
 * 处理速度标记内部的内容（不递归处理速度标记，避免无限循环）
 */
function renderSpeedContent(content: string): string {
  // 只处理停顿标记，不处理速度标记
  let result = content;

  const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
  let matchIndex = 0;
  result = result.replace(pauseRegex, (_match, ms) => {
    const pauseMs = parseInt(ms, 10);
    const formattedTime = formatPauseTime(pauseMs);
    const pauseId = `pause-${matchIndex++}`;

    return `<span class="pause-marker-wrapper group relative inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-cyan-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-sky-200 transition-colors mr-2" contenteditable="false" data-pause-ms="${pauseMs}" data-pause-id="${pauseId}"><span class="pause-time">${formattedTime}</span><svg class="w-3 h-3 pause-arrow cursor-pointer hover:text-cyan-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-pause-arrow="true" data-pause-ms="${pauseMs}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="pause-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除停顿">×</span></span>`;
  });

  // 匹配音效标记 <sound effect="applause" />
  const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
  let soundIndex = 0;
  result = result.replace(soundRegex, (_match, effectId) => {
    const effect = getSoundEffectById(effectId);
    const soundId = `sound-${soundIndex++}`;
    if (!effect) {
      console.warn(`[textRenderer] 未知的音效 ID: ${effectId}`);
      return `<span class="sound-effect-marker unknown group relative inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-default select-none hover:bg-gray-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">未知音效</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
    }

    // 样式：浅橙色背景（bg-orange-100），橙色文字（text-orange-700），圆角按钮，类似停顿标记
    return `<span class="sound-effect-marker group relative inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-orange-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">${effect.name}</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-orange-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
  });

  return result;
}

const toneMap: Record<string, string> = {
  'a': 'āáǎàa',
  'o': 'ōóǒòo',
  'e': 'ēéěèe',
  'i': 'īíǐìi',
  'u': 'ūúǔùu',
  'v': 'ǖǘǚǜü'
};

function getToneMark(pinyinStr: string): string {
  const tone = pinyinStr.match(/\d$/);
  if (!tone) return pinyinStr;
  const toneNum = parseInt(tone[0], 10);
  const basePinyin = pinyinStr.replace(/\d$/, '');

  if (toneNum === 5 || toneNum === 0) return basePinyin; // 轻声

  // 优先级: a > o > e > i, u (后出现的)
  // 简单规则：如果有 a, o, e 则标在它们上
  // 如果是 iu 或 ui，标在最后一个元音上
  let charToChange = '';
  let indexToChange = -1;

  if (basePinyin.includes('a')) {
    charToChange = 'a'; // a always takes precedence
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
    // 找最后一个元音 i, u, v
    for (let i = basePinyin.length - 1; i >= 0; i--) {
      if (['i', 'u', 'v', 'ü'].includes(basePinyin[i])) {
        charToChange = basePinyin[i] === 'ü' ? 'v' : basePinyin[i];
        indexToChange = i;
        break;
      }
    }
  }

  if (indexToChange === -1) return basePinyin;

  const replacements = toneMap[charToChange];
  if (!replacements) return basePinyin;

  // toneNum 1-4 对应索引 0-3
  const replacement = replacements[toneNum - 1];

  return basePinyin.substring(0, indexToChange) + replacement + basePinyin.substring(indexToChange + 1);
}

/**
 * 处理发音人标记内部的内容（不处理发音人标记本身）
 * 需要支持速度、停顿、数字读法、多音字、重读、音效
 */
function renderVoiceContent(content: string): string {
  let result = content;

  // 先处理速度标记（允许内部包含其他标记）
  const speedRegex = /<speed\s+rate=["']([^"']+)["']>([\s\S]*?)<\/speed>/g;
  let changed = true;
  let iterations = 0;
  const maxIterations = 10;

  while (changed && iterations < maxIterations) {
    const before = result;
    result = result.replace(speedRegex, (_match, rate, inner) => {
      const rateValue = parseFloat(rate) || 1.0;
      const processedContent = renderSpeedContent(inner);
      return `<span class="speed-marker-wrapper" contenteditable="false" data-speed="${rateValue}"><span class="speed-badge"><span class="speed-value">${rateValue}x</span><svg class="speed-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg><span class="speed-close">×</span></span><span class="speed-text text-yellow-600 border-b-2 border-yellow-400 hover:border-yellow-500 hover:text-yellow-700 transition-colors pb-0.5 font-medium">${processedContent}</span></span>`;
    });
    changed = before !== result;
    iterations++;
  }

  // 停顿
  const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
  let pauseIndex = 0;
  result = result.replace(pauseRegex, (_match, ms) => {
    const pauseMs = parseInt(ms, 10);
    const formattedTime = formatPauseTime(pauseMs);
    const pauseId = `pause-${pauseIndex++}`;
    return `<span class="pause-marker-wrapper group relative inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-cyan-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-sky-200 transition-colors mr-2" contenteditable="false" data-pause-ms="${pauseMs}" data-pause-id="${pauseId}"><span class="pause-time">${formattedTime}</span><svg class="w-3 h-3 pause-arrow cursor-pointer hover:text-cyan-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-pause-arrow="true" data-pause-ms="${pauseMs}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="pause-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除停顿">×</span></span>`;
  });

  // 数字读法
  const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
  result = result.replace(numberRegex, (_match, mode, numberContent) => {
    let modeText = '';
    switch (mode) {
      case 'cardinal': modeText = '读数值'; break;
      case 'digits': modeText = '读数字'; break;
      case 'ordinal': modeText = '读序数'; break;
      case 'telephone': modeText = '读号码'; break;
      default: modeText = mode;
    }
    return `<span class="number-marker-wrapper group relative inline-flex items-center cursor-default select-none text-green-600 mr-2 whitespace-nowrap" contenteditable="false" data-number-mode="${mode}"><span class="number-content border-b border-transparent hover:border-green-300 transition-colors">${numberContent}</span><span class="number-mode-badge inline-flex items-center ml-0.5 text-sm cursor-pointer hover:text-green-700" data-number-arrow="true">[${modeText}]</span><span class="number-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除标记">×</span></span>`;
  });

  // 多音字
  const polyphoneRegex = /<polyphone\s+pronunciation=["']([^"']+)["']>([^<]*)<\/polyphone>/g;
  result = result.replace(polyphoneRegex, (_match, pronunciation, contentText) => {
    const toneMark = getToneMark(pronunciation);
    return `<span class="polyphone-marker-wrapper group relative inline-flex items-center cursor-default select-none text-blue-600 mx-1 whitespace-nowrap" contenteditable="false" data-polyphone-pinyin="${pronunciation}"><span class="polyphone-content border-b border-transparent hover:border-blue-300 transition-colors">${contentText}</span><span class="polyphone-pinyin-badge inline-flex items-center ml-0.5 text-sm cursor-pointer hover:text-blue-700 font-medium" data-polyphone-arrow="true">[${toneMark}]</span><span class="polyphone-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除标记">×</span></span>`;
  });

  // 重读
  const rereadRegex = /<reread>([^<]*)<\/reread>/g;
  result = result.replace(rereadRegex, (_match, contentText) => {
    return `<span class="reread-marker-wrapper group cursor-default select-none text-purple-600 mx-1 whitespace-nowrap" contenteditable="false" data-reread="true"><span class="reread-badge relative inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium whitespace-nowrap">重读<span class="reread-close hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm" title="删除标记">×</span></span><span class="reread-content border-b-2 border-purple-400 hover:border-purple-500 transition-colors leading-tight pb-0.5">${contentText}</span></span>`;
  });

  // 音效
  const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
  let soundIndex = 0;
  result = result.replace(soundRegex, (_match, effectId) => {
    const effect = getSoundEffectById(effectId);
    const soundId = `sound-${soundIndex++}`;
    if (!effect) {
      console.warn(`[textRenderer] 未知的音效 ID: ${effectId}`);
      return `<span class="sound-effect-marker unknown group relative inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-default select-none hover:bg-gray-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">未知音效</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
    }
    // 样式：浅橙色背景（bg-orange-100），橙色文字（text-orange-700），圆角按钮，类似停顿标记
    return `<span class="sound-effect-marker group relative inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-orange-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">${effect.name}</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-orange-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
  });

  return result;
}

/**
 * 将文本中的停顿标记转换为可显示的 HTML
 * @param text 包含标记的文本
 * @param locale 当前语言（用于翻译语音名称）
 * @returns 转换后的 HTML 字符串
 */
export function renderTextWithMarkers(text: string, locale?: string): string {
  let result = text;
  result = result.replace(/\r\n?/g, '\n');

  // 先处理速度标记（成对标签），需要处理嵌套但避免无限递归
  // 匹配速度标记 <speed rate="1.5">文本</speed>
  const speedRegex = /<speed\s+rate=["']([^"']+)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g;

  let changed = true;
  let iterations = 0;
  const maxIterations = 10; // 防止无限循环

  while (changed && iterations < maxIterations) {
    const before = result;
    result = result.replace(speedRegex, (_match, rate, content) => {
      const rateValue = parseFloat(rate) || 1.0;
      // 处理内部内容（只处理停顿等标记，不处理速度标记）
      const processedContent = renderSpeedContent(content);
      // 返回带有交互式标签的 span（包含箭头和关闭按钮）
      return `<span class="speed-marker-wrapper" contenteditable="false" data-speed="${rateValue}"><span class="speed-badge select-none"><span class="speed-value">${rateValue}x</span><svg class="speed-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg><span class="speed-close">×</span></span><span class="speed-text text-yellow-600 border-b-2 border-yellow-400 hover:border-yellow-500 hover:text-yellow-700 transition-colors pb-0.5 font-medium">${processedContent}</span></span>`;
    });
    changed = before !== result;
    iterations++;
  }

  // 匹配停顿标记 <pause ms="200"/>
  const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;

  let matchIndex = 0;
  result = result.replace(pauseRegex, (_match, ms) => {
    const pauseMs = parseInt(ms, 10);
    const formattedTime = formatPauseTime(pauseMs);
    const pauseId = `pause-${matchIndex++}`;

    // 返回一个可显示的 HTML 元素，右箭头可点击
    // 样式：浅蓝色背景（bg-sky-100），青色文字（text-cyan-700），圆角按钮
    return `<span class="pause-marker-wrapper group relative inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-cyan-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-sky-200 transition-colors mr-2" contenteditable="false" data-pause-ms="${pauseMs}" data-pause-id="${pauseId}"><span class="pause-time">${formattedTime}</span><svg class="w-3 h-3 pause-arrow cursor-pointer hover:text-cyan-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-pause-arrow="true" data-pause-ms="${pauseMs}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="pause-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除停顿">×</span></span>`;
  });

  // 匹配数字读法标记 <number mode="cardinal">123</number>
  const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
  result = result.replace(numberRegex, (_match, mode, content) => {
    // 根据模式显示不同的文本
    let modeText = '';
    switch (mode) {
      case 'cardinal': modeText = '读数值'; break;
      case 'digits': modeText = '读数字'; break;
      case 'ordinal': modeText = '读序数'; break;
      case 'telephone': modeText = '读号码'; break;
      default: modeText = mode;
    }

    // 样式：文字绿色，无背景，叉号位于最后
    // 样式：文字绿色，无背景，叉号位于最后
    // 样式：文字绿色，无背景，叉号位于右上角类似角标
    return `<span class="number-marker-wrapper group relative inline-flex items-center cursor-default mr-2 whitespace-nowrap" contenteditable="false" data-number-mode="${mode}"><span class="number-content text-green-600 border-b border-transparent hover:border-green-300 transition-colors">${content}</span><span class="number-mode-badge select-none inline-flex items-center ml-0.5 text-sm cursor-pointer text-green-600 hover:text-green-700" data-number-arrow="true">[${modeText}]</span><span class="number-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10 select-none" title="删除标记">×</span></span>`;
  });







  // 匹配多音字标记 <polyphone pronunciation="zhong1">重</polyphone>
  const polyphoneRegex = /<polyphone\s+pronunciation=["']([^"']+)["']>([^<]*)<\/polyphone>/g;
  result = result.replace(polyphoneRegex, (_match, pronunciation, content) => {
    // 转换拼音为带声调格式: zhong1 -> zhōng
    const toneMark = getToneMark(pronunciation);

    // 样式：文字蓝色，拼音显示在旁边 [pinyin]
    return `<span class="polyphone-marker-wrapper group relative inline-flex items-center cursor-default mx-1 whitespace-nowrap" contenteditable="false" data-polyphone-pinyin="${pronunciation}"><span class="polyphone-content text-blue-600 border-b border-transparent hover:border-blue-300 transition-colors">${content}</span><span class="polyphone-pinyin-badge select-none inline-flex items-center ml-0.5 text-sm cursor-pointer text-blue-600 hover:text-blue-700 font-medium" data-polyphone-arrow="true">[${toneMark}]</span><span class="polyphone-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10 select-none" title="删除标记">×</span></span>`;
  });

  // 匹配重读标记 <reread>文本</reread>
  const rereadRegex = /<reread>([^<]*)<\/reread>/g;
  result = result.replace(rereadRegex, (_match, content) => {
    return `<span class="reread-marker-wrapper group cursor-default mx-1 whitespace-nowrap" contenteditable="false" data-reread="true"><span class="reread-badge select-none relative inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium whitespace-nowrap">重读<span class="reread-close hidden group-hover:flex absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm" title="删除标记">×</span></span><span class="reread-content text-purple-600 border-b-2 border-purple-400 hover:border-purple-500 transition-colors leading-tight pb-0.5">${content}</span></span>`;
  });

  // 匹配发音人标记 <voice voice_id="zhiwei" voice_name="云希 (男)" voice_avatar="云">文本</voice>
  // 使用更宽松的匹配以支持嵌套标记
  const voiceRegex = /<voice\s+voice_id=["']([^"']+)["']\s+voice_name=["']([^"']+)["']\s+voice_avatar=["']([^"']*)["']>([\s\S]*?)<\/voice>/g;
  result = result.replace(voiceRegex, (_match, voiceId, voiceName, voiceAvatar, content) => {
    // 处理内部内容（可能包含其他标记）
    const processedContent = renderVoiceContent(content);

    // 获取翻译后的语音名称
    const translatedVoiceName = (() => {
      const translated = t(`voices.${voiceId}`, undefined, locale);
      return translated === `voices.${voiceId}` ? voiceName : translated;
    })();

    // 紧凑卡片样式：左侧小头像 + 右侧内容
    // 重要：不在内部元素上设置 contenteditable，避免创建嵌套的可编辑上下文
    // 整个标记设置为 inline-block 以保持完整性，但允许光标进出
    // 在发音人框后添加一个光标锚点元素，让用户可以在框外输入文本
    const displayAvatar = voiceAvatar || getVoiceAvatar(voiceId, translatedVoiceName);
    // 判断是否为图片 URL：http/https、file:// 协议、相对路径（./）或绝对路径（/）且包含图片扩展名
    const isImageUrl = displayAvatar.startsWith('http://') ||
      displayAvatar.startsWith('https://') ||
      displayAvatar.startsWith('file://') ||
      displayAvatar.startsWith('app://') ||
      ((displayAvatar.startsWith('/') || displayAvatar.startsWith('./')) && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(displayAvatar)) ||
      // 如果路径包含图片扩展名且长度合理，也认为是图片 URL（处理相对路径的情况）
      (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(displayAvatar) && displayAvatar.length > 5);

    // 根据头像类型渲染不同的 HTML
    // 如果是图片 URL，使用 img 标签，并添加错误处理后备方案
    // 注意：后备方案只在图片加载失败时显示，正常情况下只显示图片
    // 头像尺寸从 w-5 h-5 (20px) 增大到 w-7 h-7 (28px)
    // 添加 cursor-pointer 使头像可点击
    const avatarHtml = isImageUrl
      ? `<span class="relative inline-flex items-center justify-center w-7 h-7 cursor-pointer hover:opacity-80 transition-opacity" style="position: relative;" title="${translatedVoiceName}"><img src="${displayAvatar.replace(/"/g, '&quot;')}" alt="${translatedVoiceName.replace(/"/g, '&quot;')}" class="voice-avatar w-7 h-7 rounded-full object-cover select-none" style="border: 1px solid rgba(255,255,255,0.3); position: relative; z-index: 1; pointer-events: none;" contenteditable="false" onerror="this.style.display='none'; const fallback=this.nextElementSibling; if(fallback && fallback.classList.contains('voice-avatar-fallback')) { fallback.style.display='inline-flex'; }" /><span class="voice-avatar-fallback hidden inline-flex items-center justify-center w-7 h-7 text-white text-sm font-bold rounded-full select-none" style="background: linear-gradient(to bottom right, #fb923c, #f97316); position: absolute; left: 0; top: 0; z-index: 0; pointer-events: none;" contenteditable="false">${translatedVoiceName.charAt(0)}</span></span>`
      : `<span class="voice-avatar inline-flex items-center justify-center w-7 h-7 text-white text-sm font-bold rounded-full select-none cursor-pointer hover:opacity-80 transition-opacity" style="background: linear-gradient(to bottom right, #fb923c, #f97316);" contenteditable="false" title="${translatedVoiceName}">${displayAvatar}</span>`;

    return `<span class="voice-marker-wrapper group inline-block mx-0.5 align-baseline" data-voice-id="${voiceId}" data-voice-name="${voiceName}" data-voice-avatar="${displayAvatar}" data-voice-translated-name="${translatedVoiceName}" style="background: linear-gradient(to right, #fff7ed, #ffedd5); border: 1px solid #fed7aa; border-radius: 0.5rem; padding: 0.125rem 0.5rem 0.125rem 0.125rem;"><span class="relative inline-flex items-center align-baseline">${avatarHtml}<span class="voice-close absolute -top-1 -right-1 hidden group-hover:inline-flex items-center justify-center w-3.5 h-3.5 bg-gray-300 hover:bg-red-500 text-white rounded-full text-[10px] leading-none cursor-pointer transition-colors" contenteditable="false" title="删除标记" style="pointer-events: auto; z-index: 20;" data-voice-close="true">×</span></span><span class="voice-content inline align-baseline ml-1.5" style="color: #1f2937;">${processedContent}</span></span><span class="voice-cursor-anchor" data-cursor-anchor="true">&#8203;</span>`;
  });

  // 匹配音效标记 <sound effect="applause" />
  const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
  let soundIndex = 0;
  result = result.replace(soundRegex, (_match, effectId) => {
    const effect = getSoundEffectById(effectId);
    const soundId = `sound-${soundIndex++}`;
    if (!effect) {
      console.warn(`[textRenderer] 未知的音效 ID: ${effectId}`);
      return `<span class="sound-effect-marker unknown group relative inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-default select-none hover:bg-gray-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">未知音效</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-gray-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
    }

    // 样式：浅橙色背景（bg-orange-100），橙色文字（text-orange-700），圆角按钮，类似停顿标记
    return `<span class="sound-effect-marker group relative inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium cursor-default select-none hover:bg-orange-200 transition-colors mr-2" contenteditable="false" data-effect-id="${effectId}" data-sound-id="${soundId}"><span class="sound-name">${effect.name}</span><svg class="w-3 h-3 sound-arrow cursor-pointer hover:text-orange-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-sound-arrow="true" data-effect-id="${effectId}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg><span class="sound-close hidden group-hover:flex absolute -top-1.5 -right-2 w-3.5 h-3.5 bg-gray-400 hover:bg-red-500 text-white rounded-full items-center justify-center text-[10px] leading-none cursor-pointer shadow-sm z-10" title="删除音效">×</span></span>`;
  });

  // 如果结果以发音人标记开头，在开头添加一个光标锚点，让用户可以在框前面输入
  if (result.startsWith('<span class="voice-marker-wrapper')) {
    result = '<span class="voice-cursor-anchor" data-cursor-anchor="true">&#8203;</span>' + result;
  }

  // 将换行符转换为 <br>
  // 注意：如果结果以 <br> 结尾（还是空行？），浏览器可能不会显示最后一行
  // 所以需要追加一个占位的 br 来撑开高度，或者让光标能停在最后
  result = result.replace(/\n/g, '<br>');

  if (result.endsWith('<br>')) {
    result += '<br class="voice-trailing-break" contenteditable="false">';
  }

  return result;
}

// 计算文本长度时排除零宽字符
function getTextLengthExcludingZeroWidth(text: string): number {
  return text.replace(/\u200B/g, '').length;
}

// 遍历 DOM 节点的 visitor 回调类型
type TraverseVisitor = (type: 'text' | 'newline', content: string, node: Node) => void;

/**
 * 通用的 DOM 遍历函数，用于保持提取文本和计算光标位置的一致性
 */
function traverseDom(root: Node, visitor: TraverseVisitor) {
  let hasContent = false;
  let endsWithNewline = false;

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent || '';
      // 移除零宽字符 \u200B
      const cleanedText = textContent.replace(/\u200B/g, '');

      if (cleanedText.length > 0) {
        visitor('text', cleanedText, node);
        hasContent = true;
        endsWithNewline = cleanedText.endsWith('\n');
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      // 处理光标锚点：视为文本的一部分（虽然为空），递归处理其内容
      if (element.hasAttribute('data-cursor-anchor') || element.classList.contains('voice-cursor-anchor')) {
        for (let i = 0; i < node.childNodes.length; i++) {
          processNode(node.childNodes[i]);
        }
        return;
      }

      // 各种标记的处理...
      let markerContent = null;
      let isMarker = false;

      if (element.hasAttribute('data-pause-ms')) {
        const ms = element.getAttribute('data-pause-ms') || '';
        markerContent = `<pause ms="${ms}"/>`;
        isMarker = true;
      } else if (element.hasAttribute('data-speed')) {
        const rate = element.getAttribute('data-speed') || '1.0';

        // 速度标记比较特殊，它也是个容器
        visitor('text', `<speed rate="${rate}">`, node);
        hasContent = true;
        endsWithNewline = false;

        const speedTextEl = element.querySelector('.speed-text');
        if (speedTextEl) {
          for (let i = 0; i < speedTextEl.childNodes.length; i++) {
            processNode(speedTextEl.childNodes[i]);
          }
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            if (child.nodeType === Node.ELEMENT_NODE && (child as Element).classList.contains('speed-badge')) {
              continue;
            }
            processNode(child);
          }
        }

        visitor('text', `</speed>`, node);
        hasContent = true;
        endsWithNewline = false;
        return;

      } else if (element.hasAttribute('data-number-mode')) {
        const mode = element.getAttribute('data-number-mode') || 'cardinal';
        const content = element.querySelector('.number-content')?.textContent || '';
        markerContent = `<number mode="${mode}">${content}</number>`;
        isMarker = true;
      } else if (element.hasAttribute('data-polyphone-pinyin')) {
        const pinyin = element.getAttribute('data-polyphone-pinyin') || '';
        const content = element.querySelector('.polyphone-content')?.textContent || '';
        markerContent = `<polyphone pronunciation="${pinyin}">${content}</polyphone>`;
        isMarker = true;
      } else if (element.hasAttribute('data-reread')) {
        const content = element.querySelector('.reread-content')?.textContent || '';
        markerContent = `<reread>${content}</reread>`;
        isMarker = true;
      } else if (element.hasAttribute('data-effect-id')) {
        const id = element.getAttribute('data-effect-id') || '';
        markerContent = `<sound effect="${id}" />`;
        isMarker = true;
      } else if (element.hasAttribute('data-voice-id')) {
        const id = element.getAttribute('data-voice-id') || '';
        const name = element.getAttribute('data-voice-name') || '';
        const avatar = element.getAttribute('data-voice-avatar') || '';

        visitor('text', `<voice voice_id="${id}" voice_name="${name}" voice_avatar="${avatar}">`, node);
        hasContent = true;
        endsWithNewline = false;

        const voiceContentEl = element.querySelector('.voice-content');
        if (voiceContentEl) {
          for (let i = 0; i < voiceContentEl.childNodes.length; i++) {
            processNode(voiceContentEl.childNodes[i]);
          }
        }

        visitor('text', `</voice>`, node);
        hasContent = true;
        endsWithNewline = false;
        return;
      }

      if (isMarker && markerContent) {
        visitor('text', markerContent, node);
        hasContent = true;
        endsWithNewline = false;
        return;
      }

      // 处理块级元素换行逻辑
      if (element.tagName === 'DIV' || element.tagName === 'P') {
        const hasOnlyBr = element.childNodes.length === 1 &&
          element.firstChild?.nodeType === Node.ELEMENT_NODE &&
          (element.firstChild as Element).tagName === 'BR';

        // Pre-check
        if (hasContent && !endsWithNewline) {
          visitor('newline', '\n', node);
          endsWithNewline = true;
        }

        if (!hasOnlyBr) {
          for (let i = 0; i < node.childNodes.length; i++) {
            processNode(node.childNodes[i]);
          }
        }

        // Post-check
        if (node.nextSibling && !endsWithNewline) {
          visitor('newline', '\n', node);
          endsWithNewline = true;
        }
        return;
      } else if (element.tagName === 'BR') {
        // 忽略用于占位的末尾换行
        if (element.classList.contains('voice-trailing-break')) {
          return;
        }
        visitor('newline', '\n', node);
        hasContent = true;
        endsWithNewline = true;
        return;
      }

      // 默认递归
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }
    }
  };

  processNode(root);
}

export function extractTextFromRendered(html: string): string {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  let result = '';
  traverseDom(tempDiv, (type, content) => {
    result += content;
  });
  return result;
}

/**
 * 获取光标在纯文本中的位置索引
 * @param root 编辑器根元素
 * @param range 当前选区 Range
 */
export function getCursorIndex(root: HTMLElement, range: Range): number {
  let cursorIndex = 0;
  let found = false;

  // 使用 traverseDom 模拟文本生成过程，同时检测光标位置
  traverseDom(root, (type, content, node) => {
    if (found) return;

    // 检查光标是否在这个节点内或之前
    // 情况 1: Node 是 TextNode
    if (node.nodeType === Node.TEXT_NODE) {
      if (node === range.endContainer) {
        // 光标在这个文本节点内
        // 计算节点内的偏移（排除零宽字符）
        const textBeforeCursor = (node.textContent || '').substring(0, range.endOffset);
        const lengthBefore = getTextLengthExcludingZeroWidth(textBeforeCursor);
        cursorIndex += lengthBefore;
        found = true;
        return;
      }
      // 光标不在这个节点，加上整个节点的有效长度
      cursorIndex += content.length; // content 已经是 cleanedText
    } else {
      // Newline 或 Tag
      // 如果是 newline，长度为 1
      if (type === 'newline') {
        // 这里很难精确判断光标是否"在"换行符上，因为换行符是虚拟的
        // 通常如果光标在 <br> 之前，会落在前一个节点。如果光标在 <br> 之后，可能落在父节点的 offset

        // 检查 Range 是否刚好指向这个 newline 的产生位置
        // 例如 <br> 元素
        if (node.nodeName === 'BR') {
          if (range.endContainer === node.parentNode) {
            // 光标在父元素中
            const nodeIndex = Array.prototype.indexOf.call(node.parentNode?.childNodes, node);
            if (range.endOffset === nodeIndex) {
              // 光标在 BR 之前
              found = true;
              return;
            }
            if (range.endOffset === nodeIndex + 1) {
              // 光标在 BR 之后
              cursorIndex += 1; // 加上换行符
              found = true;
              return;
            }
          }
        }

        cursorIndex += content.length;
      } else {
        // Tag start/end string
        cursorIndex += content.length;
      }
    }

    // 兜底：如果 range 在此节点之后的父容器位置
    if (!found && range.endContainer.contains(node) && range.endContainer !== node) {
      // 光标在父容器中，且在当前节点之后？
      // 比较复杂，简化处理：累加
    }
  });

  return cursorIndex;
}

/**
 * 根据纯文本索引获取 DOM 位置
 * @param root 编辑器根元素
 * @param index 目标索引
 */
export function getDomPosition(root: HTMLElement, index: number): { node: Node, offset: number } | null {
  let currentIndex = 0;
  let result: { node: Node, offset: number } | null = null;

  traverseDom(root, (type, content, node) => {
    if (result) return;

    const nextIndex = currentIndex + content.length;

    if (index <= nextIndex) {
      // 目标还在当前块内
      const localOffset = index - currentIndex;

      if (type === 'text' && node.nodeType === Node.TEXT_NODE) {
        // 需考虑零宽字符，反向查找真实 offset
        const fullText = node.textContent || '';
        let realOffset = 0;
        let validChars = 0;
        for (let i = 0; i < fullText.length; i++) {
          if (validChars === localOffset) break;
          if (fullText[i] !== '\u200B') validChars++;
          realOffset++;
        }
        // 如果到了末尾
        if (validChars < localOffset) realOffset = fullText.length;

        result = { node, offset: realOffset };
      } else if (type === 'newline' && node.nodeName === 'BR') {
        // 如果落在 BR 上
        if (localOffset === 0) {
          // BR 前
          result = { node: node.parentNode!, offset: Array.prototype.indexOf.call(node.parentNode!.childNodes, node) };
        } else {
          // BR 后
          result = { node: node.parentNode!, offset: Array.prototype.indexOf.call(node.parentNode!.childNodes, node) + 1 };
        }
      } else {
        // 落在标签字符串中间？通常不应该发生，除非 index 算错了
        // 默认返回当前节点末尾
        if (node.nodeType === Node.TEXT_NODE) {
          result = { node, offset: (node.textContent || '').length };
        } else {
          result = { node, offset: 0 }; // 无法定位到元素内部细节
        }
      }
    }

    currentIndex = nextIndex;
  });

  return result;
}

/**
 * 获取纯文本内容（不包含标记）
 * @param text 包含标记的文本
 * @returns 纯文本内容
 */
export function getPlainText(text: string): string {
  // 移除所有标记
  return text.replace(/<[^>]+>/g, '');
}
