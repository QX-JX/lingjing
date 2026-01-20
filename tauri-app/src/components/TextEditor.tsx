import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { renderTextWithMarkers, extractTextFromRendered } from '../utils/textRenderer';
import { PauseDropdown } from './PauseDropdown';
import { SpeedDropdown } from './SpeedDropdown';
import { NumberReadingDropdown } from './NumberReadingDropdown';
import { getTextCharCount } from '../utils/textProcessor';

export interface TextEditorRef {
  insertSSMLTag: (tag: string) => void;
  getCursorPosition: () => number;
  getSelection: () => { start: number; end: number; text: string };
  setCursorPosition: (position: number) => void;
  focus: () => void;
  getContainer: () => HTMLDivElement | null;
}

interface TextEditorProps {
  placeholder?: string;
}

// 保存和恢复光标位置的辅助函数
function saveCursorPosition(container: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);

  // 计算文本位置（排除标记元素）
  let position = 0;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    if (node === range.endContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        position += range.endOffset;
      }
      break;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      position += node.textContent?.length || 0;
    }
  }

  return position;
}

function restoreCursorPosition(container: HTMLElement, position: number) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  let currentPos = 0;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const textLength = textNode.textContent?.length || 0;

      if (currentPos + textLength >= position) {
        range.setStart(textNode, position - currentPos);
        range.setEnd(textNode, position - currentPos);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentPos += textLength;
    }
  }

  // 如果位置超出，设置到末尾
  if (container.lastChild) {
    const lastNode = container.lastChild;
    if (lastNode.nodeType === Node.TEXT_NODE) {
      const textLength = lastNode.textContent?.length || 0;
      range.setStart(lastNode, textLength);
      range.setEnd(lastNode, textLength);
    } else {
      range.setStartAfter(lastNode);
      range.setEndAfter(lastNode);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ placeholder }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const { text, setText, maxLength, addToHistory, historyIndex } = useAppStore();
    const debounceTimerRef = useRef<number | null>(null);
    const prevHistoryIndexRef = useRef<number>(0);
    const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
    const [pauseDropdownPosition, setPauseDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentPauseElement, setCurrentPauseElement] = useState<HTMLElement | null>(null);
    const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
    const [speedDropdownPosition, setSpeedDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentSpeedElement, setCurrentSpeedElement] = useState<HTMLElement | null>(null);
    const [isNumberReadingDropdownOpen, setIsNumberReadingDropdownOpen] = useState(false);
    const [numberReadingDropdownPosition, setNumberReadingDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentNumberElement, setCurrentNumberElement] = useState<HTMLElement | null>(null);
    const isUpdatingRef = useRef(false);

    // 将文本渲染为 HTML
    const renderedHtml = renderTextWithMarkers(text);

    // 从 contentEditable 提取文本并更新状态
    const updateTextFromEditor = () => {
      if (!editorRef.current || isUpdatingRef.current) return;

      const html = editorRef.current.innerHTML;
      const extractedText = extractTextFromRendered(html);

      // 检查字符数（排除标记）
      const charCount = getTextCharCount(extractedText);
      if (extractedText !== text && charCount <= maxLength) {
        setText(extractedText);
      }
    };

    // 处理输入事件
    const handleInput = () => {
      updateTextFromEditor();
    };

    // 处理粘贴事件
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text/plain');

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(pastedText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      updateTextFromEditor();
    };

    // 处理点击事件 - 检测是否点击了停顿按钮或变速标签
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      // 检查是否点击了停顿箭头
      const pauseArrow = target.closest('[data-pause-arrow="true"]');
      if (pauseArrow) {
        e.preventDefault();
        e.stopPropagation();

        const pauseElement = pauseArrow.closest('[data-pause-ms]') as HTMLElement;
        if (pauseElement) {
          setCurrentPauseElement(pauseElement);
          const rect = pauseArrow.getBoundingClientRect();
          setPauseDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsPauseDropdownOpen(true);
        }
        return;
      }

      // 检查是否点击了变速关闭按钮
      const speedClose = target.closest('.speed-close');
      if (speedClose) {
        e.preventDefault();
        e.stopPropagation();

        const speedWrapper = speedClose.closest('.speed-marker-wrapper') as HTMLElement;
        if (speedWrapper && editorRef.current) {
          // 查找所有 speed wrapper 的索引
          const allSpeedWrappers = Array.from(
            editorRef.current.querySelectorAll('.speed-marker-wrapper')
          ) as HTMLElement[];
          const wrapperIndex = allSpeedWrappers.indexOf(speedWrapper);

          if (wrapperIndex !== -1) {
            // 在原始文本中移除对应的 speed 标记
            const speedRegex = /<speed\s+rate=["']([^"']+)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g;
            let matchIndex = 0;
            const newText = text.replace(speedRegex, (match, rate, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 只保留内容，移除 speed 标签
              }
              matchIndex++;
              return match;
            });

            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了变速箭头
      const speedArrow = target.closest('.speed-arrow');
      if (speedArrow) {
        e.preventDefault();
        e.stopPropagation();

        const speedWrapper = speedArrow.closest('.speed-marker-wrapper') as HTMLElement;
        if (speedWrapper) {
          setCurrentSpeedElement(speedWrapper);
          const rect = speedArrow.getBoundingClientRect();
          setSpeedDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsSpeedDropdownOpen(true);
        }
        return;
      }

      // 检查是否点击了数字读法关闭按钮
      const numberClose = target.closest('.number-close');
      if (numberClose) {
        e.preventDefault();
        e.stopPropagation();

        const numberWrapper = numberClose.closest('.number-marker-wrapper');
        if (numberWrapper && editorRef.current) {
          // 查找所有 number wrapper 的索引
          const allNumberWrappers = Array.from(
            editorRef.current.querySelectorAll('.number-marker-wrapper')
          ) as HTMLElement[];
          const wrapperIndex = allNumberWrappers.indexOf(numberWrapper as HTMLElement);

          if (wrapperIndex !== -1) {
            // 在原始文本中移除对应的 number 标记
            const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
            let matchIndex = 0;
            const newText = text.replace(numberRegex, (_match, _mode, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 只保留内容，移除 number 标签
              }
              matchIndex++;
              return _match;
            });

            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了数字读法箭头 (模式角标)
      const numberArrow = target.closest('[data-number-arrow="true"]');
      if (numberArrow) {
        e.preventDefault();
        e.stopPropagation();

        const numberWrapper = numberArrow.closest('.number-marker-wrapper');
        if (numberWrapper) {
          setCurrentNumberElement(numberWrapper as HTMLElement);
          const rect = numberArrow.getBoundingClientRect();
          setNumberReadingDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsNumberReadingDropdownOpen(true);
        }
        return;
      }
    };

    // 处理按键事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // 处理删除键，避免删除标记元素
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;

        // 如果删除的是标记元素，阻止默认行为
        if (startContainer.nodeType === Node.ELEMENT_NODE) {
          const element = startContainer as Element;
          if (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') === 'false') {
            e.preventDefault();
            return;
          }
        }

        // 检查是否要删除标记元素
        const startNode = range.startContainer;
        if (startNode.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
          const prevSibling = startNode.previousSibling;
          if (prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE) {
            const prevElement = prevSibling as Element;
            if (prevElement.hasAttribute('contenteditable') && prevElement.getAttribute('contenteditable') === 'false') {
              if (e.key === 'Backspace') {
                e.preventDefault();
                prevElement.remove();
                updateTextFromEditor();
                return;
              }
            }
          }
        }
      }
    };

    // 更新编辑器内容
    useEffect(() => {
      if (!editorRef.current || isUpdatingRef.current) return;

      const currentHtml = editorRef.current.innerHTML;
      const newHtml = renderedHtml;

      if (currentHtml !== newHtml) {
        // 保存光标位置
        const savedPosition = saveCursorPosition(editorRef.current);

        isUpdatingRef.current = true;
        editorRef.current.innerHTML = newHtml;

        // 恢复光标位置
        setTimeout(() => {
          restoreCursorPosition(editorRef.current!, savedPosition);
          isUpdatingRef.current = false;
        }, 0);
      }
    }, [renderedHtml]);

    // 检测是否是撤销/重做操作
    useEffect(() => {
      const isUndoRedo = historyIndex !== prevHistoryIndexRef.current;
      prevHistoryIndexRef.current = historyIndex;

      // 如果是撤销/重做操作，不自动保存历史记录
      if (isUndoRedo) {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        return;
      }

      // 防抖保存到历史记录（仅用户输入时）
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // 只有在文本不为空时才保存历史
      const charCount = getTextCharCount(text);
      if (charCount > 0 || charCount === 0) {
        debounceTimerRef.current = window.setTimeout(() => {
          addToHistory(text);
        }, 1000); // 1秒防抖
      }

      return () => {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
        }
      };
    }, [text, addToHistory, historyIndex]);

    // 处理停顿时长修改
    const handlePauseSelect = (ms: number) => {
      if (!currentPauseElement || !editorRef.current) return;

      const oldMs = currentPauseElement.getAttribute('data-pause-ms');
      if (!oldMs) return;

      // 找到当前停顿元素在编辑器中的所有停顿元素中的索引
      const allPauseElements = Array.from(
        editorRef.current.querySelectorAll('[data-pause-ms]')
      ) as HTMLElement[];
      const currentIndex = allPauseElements.indexOf(currentPauseElement);

      if (currentIndex === -1) return;

      // 在原始文本中找到对应索引的停顿标记并替换
      const currentText = text;
      const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;

      let matchIndex = 0;
      const newText = currentText.replace(pauseRegex, (match, matchMs) => {
        if (matchIndex === currentIndex) {
          matchIndex++;
          return `<pause ms="${ms}"/>`;
        }
        matchIndex++;
        return match;
      });

      const newCharCount = getTextCharCount(newText);
      if (newCharCount <= maxLength) {
        setText(newText);
      }

      setIsPauseDropdownOpen(false);
      setCurrentPauseElement(null);
    };

    // 处理变速值修改
    const handleSpeedSelect = (speed: number) => {
      if (!currentSpeedElement || !editorRef.current) return;

      // 查找所有 speed wrapper 的索引
      const allSpeedWrappers = Array.from(
        editorRef.current.querySelectorAll('.speed-marker-wrapper')
      ) as HTMLElement[];
      const wrapperIndex = allSpeedWrappers.indexOf(currentSpeedElement);

      if (wrapperIndex === -1) return;

      // 在原始文本中找到对应的 speed 标记并替换
      const speedRegex = /<speed\s+rate=["']([^"']+)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g;
      let matchIndex = 0;
      const newText = text.replace(speedRegex, (match, rate, content) => {
        if (matchIndex === wrapperIndex) {
          matchIndex++;
          return `<speed rate="${speed}">${content}</speed>`;
        }
        matchIndex++;
        return match;
      });

      setText(newText);
      setIsSpeedDropdownOpen(false);
      setCurrentSpeedElement(null);
    };

    // 处理数字读法修改
    const handleNumberReadingSelect = (mode: string) => {
      if (!currentNumberElement || !editorRef.current) return;

      // 查找所有 number wrapper 的索引
      const allNumberWrappers = Array.from(
        editorRef.current.querySelectorAll('.number-marker-wrapper')
      ) as HTMLElement[];
      const wrapperIndex = allNumberWrappers.indexOf(currentNumberElement);

      if (wrapperIndex === -1) return;

      // 在原始文本中找到对应的 number 标记并替换
      const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
      let matchIndex = 0;
      const newText = text.replace(numberRegex, (_match, _oldMode, content) => {
        if (matchIndex === wrapperIndex) {
          matchIndex++;
          return `<number mode="${mode}">${content}</number>`;
        }
        matchIndex++;
        return _match;
      });

      const newCharCount = getTextCharCount(newText);
      if (newCharCount <= maxLength) {
        setText(newText);
      }

      setIsNumberReadingDropdownOpen(false);
      setCurrentNumberElement(null);
    };

    // 实现 ref 方法
    useImperativeHandle(ref, () => ({
      insertSSMLTag: (tag: string) => {
        if (!editorRef.current) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(tag);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        updateTextFromEditor();
      },
      getCursorPosition: () => {
        if (!editorRef.current) return 0;
        return saveCursorPosition(editorRef.current);
      },
      getSelection: () => {
        console.log('[TextEditor] getSelection 被调用');
        if (!editorRef.current) {
          console.warn('[TextEditor] editorRef.current 不存在');
          return { start: 0, end: 0, text: '' };
        }

        const selection = window.getSelection();
        console.log('[TextEditor] window.getSelection()', {
          hasSelection: !!selection,
          rangeCount: selection?.rangeCount || 0
        });

        if (!selection || selection.rangeCount === 0) {
          const pos = saveCursorPosition(editorRef.current);
          console.log('[TextEditor] 没有选中范围，返回光标位置', pos);
          return { start: pos, end: pos, text: '' };
        }

        const range = selection.getRangeAt(0);
        const container = editorRef.current;
        console.log('[TextEditor] 选中范围信息', {
          rangeCollapsed: range.collapsed,
          startContainer: range.startContainer.nodeName,
          endContainer: range.endContainer.nodeName,
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          startContainerText: range.startContainer.nodeType === Node.TEXT_NODE ? (range.startContainer as Text).textContent?.substring(0, 20) : 'N/A',
          endContainerText: range.endContainer.nodeType === Node.TEXT_NODE ? (range.endContainer as Text).textContent?.substring(0, 20) : 'N/A'
        });

        // 计算开始位置：遍历整个容器，直到到达 startContainer
        let startPos = 0;
        const startWalker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
                  return NodeFilter.FILTER_REJECT;
                }
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        let node;
        while ((node = startWalker.nextNode())) {
          if (node === range.startContainer) {
            // 到达开始容器，添加偏移量
            if (node.nodeType === Node.TEXT_NODE) {
              startPos += range.startOffset;
            }
            break;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            startPos += node.textContent?.length || 0;
          }
        }

        console.log('[TextEditor] 计算开始位置完成', { startPos });

        // 计算结束位置：遍历整个容器，直到到达 endContainer
        let endPos = 0;
        const endWalker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
                  return NodeFilter.FILTER_REJECT;
                }
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        while ((node = endWalker.nextNode())) {
          if (node === range.endContainer) {
            // 到达结束容器，添加偏移量
            if (node.nodeType === Node.TEXT_NODE) {
              endPos += range.endOffset;
            }
            break;
          }
          if (node.nodeType === Node.TEXT_NODE) {
            endPos += node.textContent?.length || 0;
          }
        }

        console.log('[TextEditor] 计算结束位置完成', { endPos });

        // 提取选中文本（排除标记）
        // 使用 range.toString() 直接获取纯文本，这会自动排除所有 HTML 标记
        let plainText = range.toString();

        // 如果 range.toString() 返回空字符串，尝试手动提取文本节点
        if (!plainText && !range.collapsed) {
          const clonedContents = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(clonedContents);

          // 提取所有文本节点的内容
          const textNodes: Text[] = [];
          const walker = document.createTreeWalker(
            tempDiv,
            NodeFilter.SHOW_TEXT,
            null
          );

          let textNode;
          while ((textNode = walker.nextNode() as Text)) {
            if (textNode.textContent) {
              textNodes.push(textNode);
            }
          }

          plainText = textNodes.map(node => node.textContent || '').join('');
        }

        const result = { start: startPos, end: endPos, text: plainText };
        console.log('[TextEditor] getSelection 返回结果', {
          start: result.start,
          end: result.end,
          text: result.text,
          textLength: result.text.length,
          hasSelection: result.start !== result.end
        });

        return result;
      },
      setCursorPosition: (position: number) => {
        if (!editorRef.current) return;
        restoreCursorPosition(editorRef.current, position);
        editorRef.current.focus();
      },
      focus: () => {
        editorRef.current?.focus();
      },
      getContainer: () => {
        return editorRef.current;
      },
    }));

    return (
      <div className="relative w-full">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className="w-full min-h-[400px] p-6 bg-white rounded-xl border-none outline-none text-gray-800 shadow-lg shadow-orange-100/50 focus:shadow-xl focus:shadow-orange-200/50 transition-all duration-200 text-base leading-relaxed"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        />

        {!text && placeholder && (
          <div className="absolute top-6 left-6 pointer-events-none text-gray-400">
            {placeholder}
          </div>
        )}

        {getTextCharCount(text) > maxLength * 0.9 && (
          <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
            {getTextCharCount(text)} / {maxLength}
          </div>
        )}

        {/* 停顿下拉菜单 */}
        {isPauseDropdownOpen && (
          <PauseDropdown
            isOpen={isPauseDropdownOpen}
            onClose={() => {
              setIsPauseDropdownOpen(false);
              setCurrentPauseElement(null);
            }}
            onSelect={handlePauseSelect}
            position={pauseDropdownPosition}
          />
        )}

        {/* 变速下拉菜单 */}
        {isSpeedDropdownOpen && (
          <SpeedDropdown
            isOpen={isSpeedDropdownOpen}
            onClose={() => {
              setIsSpeedDropdownOpen(false);
              setCurrentSpeedElement(null);
            }}
            onSelect={handleSpeedSelect}
            position={speedDropdownPosition}
          />
        )}

        {/* 数字读法下拉菜单 */}
        {isNumberReadingDropdownOpen && (
          <NumberReadingDropdown
            isOpen={isNumberReadingDropdownOpen}
            onClose={() => {
              setIsNumberReadingDropdownOpen(false);
              setCurrentNumberElement(null);
            }}
            onSelect={handleNumberReadingSelect}
            position={numberReadingDropdownPosition}
          />
        )}
      </div>
    );
  }
);

TextEditor.displayName = 'TextEditor';
