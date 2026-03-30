import { getTextCharCount } from './textProcessor';

/**
 * 检查选区是否完全在某个发音人标记内
 * @param selection 当前的窗口选择
 * @returns 如果在发音人标记内，返回该标记元素；否则返回 null
 */
export function getParentVoiceMarker(selection: Selection): HTMLElement | null {
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.commonAncestorContainer;

  // 向上遍历找到发音人标记
  while (node && node.nodeType !== Node.DOCUMENT_NODE) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.classList?.contains('voice-marker-wrapper') && element.hasAttribute('data-voice-id')) {
        // 确保选区的开始和结束都在这个标记内
        const voiceContent = element.querySelector('.voice-content');
        if (voiceContent && voiceContent.contains(range.startContainer) && voiceContent.contains(range.endContainer)) {
          return element;
        }
      }
    }
    node = node.parentNode;
  }

  return null;
}

/**
 * 获取标记元素的纯文本内容长度
 * 对于 reread-marker-wrapper，获取 .reread-content 的文本长度
 * 对于 number-marker-wrapper，获取 .number-content 的文本长度
 * 等等...
 */
function getMarkerContentLength(element: Element): number {
  // 重读标记
  const rereadContent = element.querySelector('.reread-content');
  if (rereadContent) {
    return rereadContent.textContent?.length || 0;
  }
  // 数字读法标记
  const numberContent = element.querySelector('.number-content');
  if (numberContent) {
    return numberContent.textContent?.length || 0;
  }
  // 多音字标记
  const polyphoneContent = element.querySelector('.polyphone-content');
  if (polyphoneContent) {
    return polyphoneContent.textContent?.length || 0;
  }
  // 变速标记
  const speedText = element.querySelector('.speed-text');
  if (speedText) {
    // 变速内部可能还有其他标记，递归计算
    return getPlainTextLength(speedText);
  }
  // 停顿标记 - 停顿没有文本内容
  if (element.hasAttribute('data-pause-ms')) {
    return 0;
  }
  // 音效标记 - 音效没有文本内容
  if (element.hasAttribute('data-effect-id')) {
    return 0;
  }
  // 其他情况，返回0
  return 0;
}

/**
 * 递归计算元素内的纯文本长度（考虑嵌套标记）
 * 注意：忽略零宽字符 \u200B
 */
function getPlainTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    return text.replace(/\u200B/g, '').length;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    // 如果是标记元素，使用 getMarkerContentLength
    if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
      return getMarkerContentLength(el);
    }
    // 否则递归计算子节点
    let length = 0;
    for (let i = 0; i < node.childNodes.length; i++) {
      length += getPlainTextLength(node.childNodes[i]);
    }
    return length;
  }
  return 0;
}

/**
 * 计算文本节点在容器中的偏移位置（纯文本位置）
 * 对于标记元素，计算其内部纯文本内容的长度
 * 注意：忽略零宽字符 \u200B
 */
function getTextOffsetInContainer(
  container: Node,
  targetNode: Node,
  targetOffset: number,
  _includeMarkerText: boolean = false
): number {
  let offset = 0;
  let found = false;

  const traverse = (node: Node): boolean => {
    if (found) return true;

    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        // 计算目标之前的有效字符数量（忽略 ZWSP）
        const textContent = node.textContent || '';
        const relevantText = textContent.slice(0, targetOffset);
        offset += relevantText.replace(/\u200B/g, '').length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // targetOffset is a child index
        const elementNode = node as Element;
        for (let i = 0; i < Math.min(targetOffset, elementNode.childNodes.length); i++) {
          offset += getPlainTextLength(elementNode.childNodes[i]);
        }
      }
      found = true;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      offset += text.replace(/\u200B/g, '').length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      // 如果是标记元素（contenteditable="false"），计算其纯文本内容长度并跳过子节点遍历
      if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
        offset += getMarkerContentLength(el);
        return false; // 不进入子节点
      }
      // 递归遍历子节点
      for (let i = 0; i < node.childNodes.length; i++) {
        if (traverse(node.childNodes[i])) {
          return true;
        }
      }
    }
    return false;
  };

  traverse(container);

  return offset;
}

/**
 * 在发音人标记内部应用子标记
 * @param voiceElement 发音人标记元素
 * @param selection 当前选择
 * @param markerTag 要插入的标记类型
 * @param markerAttributes 标记属性
 * @param extractTextFromRendered 文本提取函数
 * @returns 新的发音人内容文本
 */
function applyMarkerInsideVoice(
  voiceElement: HTMLElement,
  selection: Selection,
  markerTag: string,
  markerAttributes: Record<string, string>,
  extractTextFromRendered: (html: string) => string
): { newVoiceContent: string; markerStartIndex: number; markerLength: number } | null {
  const voiceContent = voiceElement.querySelector('.voice-content');
  if (!voiceContent) return null;

  const range = selection.getRangeAt(0);

  // 获取发音人内容的完整 HTML
  const voiceContentHtml = voiceContent.innerHTML;

  // 转换为原始标记文本（保留所有已有的标记）
  const fullVoiceText = extractTextFromRendered(voiceContentHtml);

  // 计算选区在纯文本中的位置
  const startOffset = getTextOffsetInContainer(voiceContent, range.startContainer, range.startOffset, false);
  const endOffset = getTextOffsetInContainer(voiceContent, range.endContainer, range.endOffset, false);

  const selectedPlainText = range.toString().replace(/\u200B/g, '');

  console.log('[applyMarkerInsideVoice] 选区信息:', {
    selectedPlainText,
    startOffset,
    endOffset,
    rangeStartOffset: range.startOffset,
    rangeEndOffset: range.endOffset,
    startContainerType: range.startContainer.nodeType === Node.TEXT_NODE ? 'TEXT' : 'ELEMENT',
    startContainerText: range.startContainer.nodeType === Node.TEXT_NODE
      ? (range.startContainer.textContent?.substring(0, 30) || '')
      : (range.startContainer as Element).tagName,
    fullVoiceText: fullVoiceText.substring(0, 80)
  });

  // 在原始标记文本中找到对应的位置
  // 需要跳过标记，只计算纯文本位置
  let textPos = 0;
  let actualStart = -1;
  let actualEnd = -1;
  let inTag = false;

  for (let i = 0; i < fullVoiceText.length; i++) {
    const char = fullVoiceText[i];

    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
      continue;
    }

    if (!inTag) {
      if (textPos === startOffset) {
        actualStart = i;
      }
      if (textPos === endOffset) {
        actualEnd = i;
        break;
      }
      textPos++;
    }
  }

  if (actualStart === -1) actualStart = 0;
  if (actualEnd === -1) actualEnd = fullVoiceText.length;

  console.log('[applyMarkerInsideVoice] 位置映射结果:', {
    startOffset,
    endOffset,
    actualStart,
    actualEnd,
    extractedText: fullVoiceText.substring(actualStart, actualEnd),
    expectedText: selectedPlainText
  });

  // 构建标记
  const attributesStr = Object.entries(markerAttributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
  const markerOpen = `<${markerTag}${attributesStr}>`;
  const markerClose = `</${markerTag}>`;

  // 提取选中部分（可能包含标记）
  const selectedText = fullVoiceText.substring(actualStart, actualEnd);
  const fullMarker = `${markerOpen}${selectedText}${markerClose}`;

  // 构建新的voice内容
  const beforeText = fullVoiceText.substring(0, actualStart);
  const afterText = fullVoiceText.substring(actualEnd);
  const newVoiceContent = beforeText + fullMarker + afterText;

  return { newVoiceContent, markerStartIndex: actualStart, markerLength: fullMarker.length };
}

/**
 * 使用 DOM Range API 精确地为选中文本添加标记
 * 这个方法可以正确处理现有的 HTML 标记，避免位置计算错误
 * @param container 编辑器容器
 * @param selection 当前的窗口选择
 * @param markerTag 标记类型（如 'reread', 'speed', 'number'等）
 * @param markerAttributes 标记的属性对象（如 { rate: '1.5' } 或空对象）
 * @param extractTextFromRendered 从HTML提取文本的函数
 * @returns 新的文本内容和光标位置，如果失败返回 null
 */
export function applyMarkerWithDOM(
  container: HTMLElement,
  selection: Selection,
  markerTag: string,
  markerAttributes: Record<string, string>,
  extractTextFromRendered: (html: string) => string
): { newText: string; newPosition: number; selectedPlainText: string } | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);

  // Create a clean version of the selected text by removing UI artifacts (badges, etc.)
  const cleanFragment = range.cloneContents();
  const badgesSelector = [
    '.speed-badge', '.speed-close', '.speed-arrow',
    '.pause-time', '.pause-close', '.pause-arrow',
    '.number-mode-badge', '.number-close',
    '.polyphone-pinyin-badge', '.polyphone-close',
    '.reread-badge', '.reread-close',
    '.voice-name-tooltip', '.voice-close', '.voice-avatar', '.voice-avatar-fallback',
    '.sound-name', '.sound-close', '.sound-arrow'
  ].join(',');

  const badges = cleanFragment.querySelectorAll(badgesSelector);
  badges.forEach((el: Element) => el.remove());

  const selectedPlainText = (cleanFragment.textContent || '').replace(/\u200B/g, '');

  if (selectedPlainText === '' && range.toString().trim() !== '') {
    // Fallback: If cleaning removed everything but range wasn't empty, 
    // it might be a selection OF a marker (like pause). 
    // In that case, extracted text will also be empty of content (xml tags only).
    // handled by the comparison below.
  }

  // Debug log
  // console.log('[applyMarkerWithDOM] Selection validation:', {
  //   original: range.toString(),
  //   cleaned: selectedPlainText
  // });

  // 检查是否在发音人标记内
  const voiceMarker = getParentVoiceMarker(selection);
  if (voiceMarker) {
    console.log('[applyMarkerWithDOM] 选区在发音人标记内，在内部插入标记');

    // 获取发音人信息
    const voiceId = voiceMarker.getAttribute('data-voice-id') || '';
    const voiceName = voiceMarker.getAttribute('data-voice-name') || '';
    const voiceAvatar = voiceMarker.getAttribute('data-voice-avatar') || '';

    // 获取当前发音人的完整内容
    const voiceContent = voiceMarker.querySelector('.voice-content');
    if (!voiceContent) {
      console.error('[applyMarkerWithDOM] 找不到 voice-content');
      return null;
    }

    // 在发音人内容内插入标记
    const voiceInsertResult = applyMarkerInsideVoice(
      voiceMarker,
      selection,
      markerTag,
      markerAttributes,
      extractTextFromRendered
    );

    if (!voiceInsertResult) {
      console.error('[applyMarkerWithDOM] 无法在发音人内插入标记');
      return null;
    }
    const { newVoiceContent, markerStartIndex, markerLength } = voiceInsertResult;

    // 获取整个容器的HTML
    const containerHtml = container.innerHTML;

    // 提取容器中的所有文本（包含所有标记）
    const fullText = extractTextFromRendered(containerHtml);

    // 获取当前发音人的原始内容


    // 直接构建新的完整文本（不使用正则替换，避免正则问题）
    // 方法：找到发音人标记在 fullText 中的位置，直接替换
    const voiceTagStart = `<voice voice_id="${voiceId}" voice_name="${voiceName}" voice_avatar="${voiceAvatar}">`;
    const voiceTagEnd = '</voice>';

    const startIndex = fullText.indexOf(voiceTagStart);
    if (startIndex === -1) {
      console.error('[applyMarkerWithDOM] 无法找到发音人标记开始位置', {
        searchingFor: voiceTagStart,
        inText: fullText
      });
      return null;
    }

    const contentStart = startIndex + voiceTagStart.length;
    const endIndex = fullText.indexOf(voiceTagEnd, contentStart);
    if (endIndex === -1) {
      console.error('[applyMarkerWithDOM] 无法找到发音人标记结束位置');
      return null;
    }

    // 构建新文本
    const beforeVoice = fullText.substring(0, contentStart);
    const afterVoice = fullText.substring(endIndex);
    const newText = beforeVoice + newVoiceContent + afterVoice;

    // 计算新的光标位置（在标记之后）



    // 光标位置基于插入结束处的纯文本长度计算，避免标记长度干扰
    const beforeVoicePlainLength = getTextCharCount(beforeVoice);
    const markerEndInVoicePlainLength = getTextCharCount(
      newVoiceContent.substring(0, markerStartIndex + markerLength)
    );
    const newPosition = beforeVoicePlainLength + markerEndInVoicePlainLength;

    return { newText, newPosition, selectedPlainText };
  }

  // 1. 提取 range 之前的所有 HTML 内容
  const beforeRange = document.createRange();
  beforeRange.setStart(container, 0);
  beforeRange.setEnd(range.startContainer, range.startOffset);
  const beforeFragment = beforeRange.cloneContents();
  const beforeDiv = document.createElement('div');
  beforeDiv.appendChild(beforeFragment);
  const beforeHtml = beforeDiv.innerHTML;

  // 2. 提取选中的 HTML 内容
  const selectedFragment = range.cloneContents();
  const selectedDiv = document.createElement('div');
  selectedDiv.appendChild(selectedFragment);
  const selectedHtml = selectedDiv.innerHTML || selectedPlainText; // 纯文本时直接使用

  // 3. 提取 range 之后的所有 HTML 内容
  const afterRange = document.createRange();
  afterRange.setStart(range.endContainer, range.endOffset);

  // 安全检查：确保 lastChild 存在
  if (!container.lastChild) {
    console.error('[applyMarkerWithDOM] 容器没有子节点');
    return null;
  }

  afterRange.setEndAfter(container.lastChild);
  const afterFragment = afterRange.cloneContents();
  const afterDiv = document.createElement('div');
  afterDiv.appendChild(afterFragment);
  const afterHtml = afterDiv.innerHTML;

  console.log('[applyMarkerWithDOM] DOM 分段:', {
    beforeHtml: beforeHtml.substring(0, 80),
    selectedHtml: selectedHtml.substring(0, 80),
    afterHtml: afterHtml.substring(0, 80)
  });

  // 4. 从 HTML 片段中提取文本表示（保留所有标记）
  const beforeText = extractTextFromRendered(beforeHtml);
  const selectedText = extractTextFromRendered(selectedHtml);
  const afterText = extractTextFromRendered(afterHtml);

  console.log('[applyMarkerWithDOM] 提取的文本:', {
    beforeText: beforeText.substring(0, 50),
    selectedText: selectedText,
    afterText: afterText.substring(0, 50)
  });

  // 5. 验证选中的纯文本是否匹配
  const selectedTextPlain = selectedText.replace(/<[^>]+>/g, '');

  // Standardize validation: Check strict equality first, then loose equality (ignoring whitespace)
  // This is necessary because HTML templates may intrude structural whitespace (newlines/spaces) 
  // into the DOM range that extractTextFromRendered correctly ignores.
  const isStrictMatch = selectedTextPlain === selectedPlainText;
  const isLooseMatch = selectedTextPlain.replace(/\s+/g, '') === selectedPlainText.replace(/\s+/g, '');

  if (!isStrictMatch && !isLooseMatch) {
    console.error('[applyMarkerWithDOM] 选中文本验证失败', {
      expected: selectedPlainText,
      actual: selectedTextPlain,
      selectedText,
      expectedNormalized: selectedPlainText.replace(/\s+/g, ''),
      actualNormalized: selectedTextPlain.replace(/\s+/g, '')
    });
    return null;
  }

  if (!isStrictMatch && isLooseMatch) {
    console.log('[applyMarkerWithDOM] 使用宽松匹配通过验证 (忽略空白字符差异)');
  }

  // 6. 构建标记
  const attributesStr = Object.entries(markerAttributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
  const markerOpen = `<${markerTag}${attributesStr}>`;
  const markerClose = `</${markerTag}>`;
  const fullMarker = `${markerOpen}${selectedText}${markerClose}`;

  // 7. 构建新文本：before + marker + after
  const newText = beforeText + fullMarker + afterText;

  console.log('[applyMarkerWithDOM] 构建新文本:', {
    beforeLength: beforeText.length,
    markerLength: fullMarker.length,
    afterLength: afterText.length,
    newTextPreview: newText.substring(0, 100) + ' ...',
    totalLength: newText.length
  });

  // 计算新的光标位置（在标记之后）
  const newPosition = beforeText.length + fullMarker.length;

  return { newText, newPosition, selectedPlainText };
}
