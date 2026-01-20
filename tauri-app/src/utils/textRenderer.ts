/**
 * 文本渲染工具函数
 * 用于将包含标记的文本转换为可显示的 HTML
 */

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

    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-cyan-700 rounded-lg text-sm font-medium cursor-default select-none" contenteditable="false" data-pause-ms="${pauseMs}" data-pause-id="${pauseId}">
      <span class="pause-time">${formattedTime}</span>
      <svg class="w-3 h-3 pause-arrow cursor-pointer hover:text-cyan-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-pause-arrow="true" data-pause-ms="${pauseMs}">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </span>`;
  });

  return result;
}

/**
 * 将文本中的停顿标记转换为可显示的 HTML
 * @param text 包含标记的文本
 * @returns 转换后的 HTML 字符串
 */
export function renderTextWithMarkers(text: string): string {
  let result = text;

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
      return `<span class="speed-marker-wrapper" contenteditable="false" data-speed="${rateValue}"><span class="speed-badge"><span class="speed-value">${rateValue}x</span><svg class="speed-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg><span class="speed-close">×</span></span><span class="speed-text border-b-2 border-dashed border-yellow-400">${processedContent}</span></span>`;
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
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-cyan-700 rounded-lg text-sm font-medium cursor-default select-none" contenteditable="false" data-pause-ms="${pauseMs}" data-pause-id="${pauseId}">
      <span class="pause-time">${formattedTime}</span>
      <svg class="w-3 h-3 pause-arrow cursor-pointer hover:text-cyan-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-pause-arrow="true" data-pause-ms="${pauseMs}">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    </span>`;
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
    return `<span class="number-marker-wrapper group inline-flex items-center cursor-default select-none text-green-600" contenteditable="false" data-number-mode="${mode}">
      <span class="number-content border-b border-transparent hover:border-green-300 transition-colors">${content}</span>
      <span class="number-mode-badge inline-flex items-center ml-0.5 text-xs cursor-pointer hover:text-green-700" data-number-arrow="true">
        [${modeText}]
      </span>
      <span class="number-close hidden group-hover:inline-flex items-center justify-center ml-1 text-gray-400 hover:text-red-500 cursor-pointer text-sm font-bold" title="删除标记">×</span>
    </span>`;
  });

  return result;
}

/**
 * 从渲染后的 HTML 中提取原始文本（包含标记）
 * @param html 渲染后的 HTML 字符串
 * @returns 原始文本（包含标记）
 */
export function extractTextFromRendered(html: string): string {
  if (!html) return '';

  // 创建一个临时 DOM 元素来解析 HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 遍历所有节点，构建文本内容
  let result = '';

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // 如果是停顿标记，转换为原始标记格式
      if (element.hasAttribute('data-pause-ms')) {
        const ms = element.getAttribute('data-pause-ms') || '';
        result += `<pause ms="${ms}"/>`;
      } else if (element.hasAttribute('data-speed')) {
        // 如果是速度标记，转换为原始标记格式
        const rate = element.getAttribute('data-speed') || '1.0';
        result += `<speed rate="${rate}">`;
        // 递归处理子节点
        for (let i = 0; i < node.childNodes.length; i++) {
          processNode(node.childNodes[i]);
        }
        result += `</speed>`;
      } else if (element.hasAttribute('data-number-mode')) {
        // 如果是数字读法标记，转换为原始标记格式
        const mode = element.getAttribute('data-number-mode') || 'cardinal';
        // 找到 number-content 元素获取数字内容
        const numberContentEl = element.querySelector('.number-content');
        const numberContent = numberContentEl?.textContent || '';
        result += `<number mode="${mode}">${numberContent}</number>`;
      } else {
        // 递归处理子节点
        for (let i = 0; i < node.childNodes.length; i++) {
          processNode(node.childNodes[i]);
        }
      }
    }
  };

  // 处理所有子节点
  for (let i = 0; i < tempDiv.childNodes.length; i++) {
    processNode(tempDiv.childNodes[i]);
  }

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
