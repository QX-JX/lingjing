/**
 * 文本标记工具函数
 * 用于在文本编辑器中插入各种 SSML 标记
 */

export type MarkerType = 'pause' | 'repeat' | 'number' | 'polyphone' | 'speed';

/**
 * 获取标记的标签格式
 */
export function getMarkerTag(type: MarkerType, value?: string | number): string {
  switch (type) {
    case 'pause':
      const pauseMs = value || 500;
      return `<pause ms="${pauseMs}"/>`;
    case 'repeat':
      const repeatTimes = value || 2;
      return `<repeat times="${repeatTimes}"/>`;
    case 'number':
      const numberMode = value || 'cardinal';
      return `<number mode="${numberMode}"/>`;
    case 'polyphone':
      const pronunciation = value || '';
      return `<polyphone pronunciation="${pronunciation}"/>`;
    case 'speed':
      // 速度标记是成对标签，需要单独的插入函数处理
      return ''; // 不在 getMarkerTag 中处理成对标签
    default:
      return '';
  }
}

/**
 * 在文本的指定位置插入标记
 * @param text 原始文本
 * @param position 插入位置（光标位置）
 * @param markerType 标记类型
 * @param value 标记参数值
 * @returns 插入标记后的文本和新的光标位置
 */
export function insertMarker(
  text: string,
  position: number,
  markerType: MarkerType,
  value?: string | number
): { newText: string; newPosition: number } {
  const marker = getMarkerTag(markerType, value);
  const newText = text.slice(0, position) + marker + text.slice(position);
  const newPosition = position + marker.length;
  return { newText, newPosition };
}

/**
 * 插入停顿标记
 * @param text 原始文本
 * @param position 插入位置
 * @param pauseMs 停顿时长（毫秒），默认500ms
 * @returns 插入后的文本和新的光标位置
 */
export function insertPause(
  text: string,
  position: number,
  pauseMs: number = 500
): { newText: string; newPosition: number } {
  return insertMarker(text, position, 'pause', pauseMs);
}

/**
 * 插入重读标记
 */
export function insertRepeat(
  text: string,
  position: number,
  times: number = 2
): { newText: string; newPosition: number } {
  return insertMarker(text, position, 'repeat', times);
}

/**
 * 插入数字读法标记
 * @param mode 读法模式：cardinal（基数）| ordinal（序数）| digits（逐位）
 */
export function insertNumber(
  text: string,
  position: number,
  mode: 'cardinal' | 'ordinal' | 'digits' = 'cardinal'
): { newText: string; newPosition: number } {
  return insertMarker(text, position, 'number', mode);
}

/**
 * 插入多音字标记
 */
export function insertPolyphone(
  text: string,
  position: number,
  pronunciation: string
): { newText: string; newPosition: number } {
  return insertMarker(text, position, 'polyphone', pronunciation);
}

/**
 * 为选中的文本添加速度标记
 * @param text 原始文本（可能包含其他标记）
 * @param start 选中文本的起始位置（在原始文本中的位置）
 * @param end 选中文本的结束位置（在原始文本中的位置）
 * @param rate 速度倍率，默认 1.0
 * @returns 添加标记后的文本和新的光标位置
 */
export function wrapTextWithSpeed(
  text: string,
  start: number,
  end: number,
  rate: number = 1.0
): { newText: string; newPosition: number } {
  console.log('[wrapTextWithSpeed] 开始处理', { 
    textLength: text.length, 
    start, 
    end, 
    rate,
    selectedText: text.slice(start, end)
  });
  
  if (start >= end || start < 0 || end > text.length) {
    console.warn('[wrapTextWithSpeed] 参数无效', { start, end, textLength: text.length });
    return { newText: text, newPosition: start };
  }

  const beforeSelection = text.slice(0, start);
  const selectedText = text.slice(start, end);
  const afterSelection = text.slice(end);
  
  console.log('[wrapTextWithSpeed] 文本分段', {
    beforeLength: beforeSelection.length,
    selectedLength: selectedText.length,
    afterLength: afterSelection.length,
    selectedTextPreview: selectedText.substring(0, 50)
  });
  
  // 检查选中文本中是否包含未闭合的速度标签或其他标签
  // 如果包含未闭合的标签，需要特殊处理
  const openSpeedTagMatch = selectedText.match(/<speed[^>]*>(?!.*<\/speed>)/);
  const closeSpeedTagMatch = selectedText.match(/<\/speed>(?!.*<speed)/);
  
  // 如果选中文本跨过了速度标签的边界，需要先清理
  let cleanSelectedText = selectedText;
  
  // 移除完整的速度标记，保留内部文本
  cleanSelectedText = cleanSelectedText.replace(/<speed[^>]*>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g, '$1');
  
  // 如果选中文本跨越了标签边界，尝试修复
  if (openSpeedTagMatch || closeSpeedTagMatch) {
    console.warn('[wrapTextWithSpeed] 选中文本跨过了标签边界');
    // 移除部分标签（开始或结束标签）
    cleanSelectedText = cleanSelectedText.replace(/<speed[^>]*>/g, '').replace(/<\/speed>/g, '');
  }
  
  console.log('[wrapTextWithSpeed] 清理后选中文本', {
    originalLength: selectedText.length,
    cleanLength: cleanSelectedText.length,
    cleanText: cleanSelectedText.substring(0, 50)
  });
  
  // 包装新的速度标记
  const speedTag = `<speed rate="${rate}">${cleanSelectedText}</speed>`;
  const newText = beforeSelection + speedTag + afterSelection;
  
  // 计算新的光标位置（在标记结束后）
  const newPosition = start + speedTag.length;
  
  console.log('[wrapTextWithSpeed] 完成', {
    speedTag: speedTag.substring(0, 50),
    newTextLength: newText.length,
    newPosition,
    newTextPreview: newText.substring(0, 100) + '...'
  });
  
  return { newText, newPosition };
}

/**
 * 移除文本中的指定标记
 * @param text 包含标记的文本
 * @param markerType 要移除的标记类型
 * @returns 移除标记后的文本
 */
export function removeMarkers(text: string, markerType: MarkerType): string {
  // 匹配自闭合标签 <tag .../>
  const selfClosingRegex = new RegExp(`<${markerType}[^>]*/>`, 'g');
  // 匹配成对标签 <tag>...</tag>（对于 speed 标签需要处理嵌套情况）
  if (markerType === 'speed') {
    // 对于成对标签，需要递归处理嵌套的情况
    let result = text;
    let changed = true;
    while (changed) {
      const before = result;
      result = result.replace(/<speed[^>]*>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g, '$1');
      changed = before !== result;
    }
    return result;
  } else {
    const pairedRegex = new RegExp(`<${markerType}[^>]*>([^<]*)</${markerType}>`, 'g');
    let result = text.replace(selfClosingRegex, '');
    result = result.replace(pairedRegex, '$1'); // 保留标签内的文本
    return result;
  }
}

/**
 * 清理所有标记
 */
export function removeAllMarkers(text: string): string {
  const markerTypes: MarkerType[] = ['pause', 'repeat', 'number', 'polyphone', 'speed'];
  let result = text;
  for (const type of markerTypes) {
    result = removeMarkers(result, type);
  }
  return result;
}

/**
 * 提取文本中的标记信息
 */
export function extractMarkers(text: string): Array<{
  type: MarkerType;
  position: number;
  value?: string | number;
}> {
  const markers: Array<{ type: MarkerType; position: number; value?: string | number }> = [];
  const markerTypes: MarkerType[] = ['pause', 'repeat', 'number', 'polyphone', 'speed'];
  
  for (const type of markerTypes) {
    if (type === 'speed') {
      // 对于成对标签，需要匹配开始标签
      const regex = /<speed[^>]*>/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const tag = match[0];
        let value: string | number | undefined;
        
        // 提取 rate 属性值
        const valueMatch = tag.match(/rate=["']([^"']+)["']/);
        if (valueMatch) {
          const strValue = valueMatch[1];
          const numValue = Number(strValue);
          value = isNaN(numValue) ? strValue : numValue;
        }
        
        markers.push({
          type,
          position: match.index!,
          value,
        });
      }
    } else {
      const regex = new RegExp(`<${type}[^>]*/?>`, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const tag = match[0];
        let value: string | number | undefined;
        
        // 提取属性值
        const valueMatch = tag.match(/(?:ms|times|mode|pronunciation)=["']([^"']+)["']/);
        if (valueMatch) {
          const strValue = valueMatch[1];
          // 尝试转换为数字
          const numValue = Number(strValue);
          value = isNaN(numValue) ? strValue : numValue;
        }
        
        markers.push({
          type,
          position: match.index!,
          value,
        });
      }
    }
  }
  
  return markers.sort((a, b) => a.position - b.position);
}

/**
 * 验证标记语法是否正确
 */
export function validateMarkers(text: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查自闭合标签是否正确
  const selfClosingRegex = /<(pause|repeat|number|polyphone)[^>]*\/>/g;
  const matches = text.matchAll(selfClosingRegex);
  
  // 检查成对标签是否匹配
  const openTags: string[] = [];
  const tagRegex = /<(pause|repeat|number|polyphone|speed)[^>]*>|<\/(pause|repeat|number|polyphone|speed)>/g;
  
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const tagName = match[1] || match[2];
    if (match[0].startsWith('</')) {
      // 闭合标签
      if (openTags.length === 0 || openTags[openTags.length - 1] !== tagName) {
        errors.push(`位置 ${match.index}: 标签未正确匹配`);
      } else {
        openTags.pop();
      }
    } else if (!match[0].endsWith('/>')) {
      // 开始标签（非自闭合）
      openTags.push(tagName);
    }
  }
  
  if (openTags.length > 0) {
    errors.push(`有 ${openTags.length} 个标签未闭合`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
