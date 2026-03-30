import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { renderTextWithMarkers, extractTextFromRendered, getCursorIndex, getDomPosition } from '../utils/textRenderer';
import { PauseDropdown } from './PauseDropdown';
import { SpeedDropdown } from './SpeedDropdown';
import { SoundEffectDropdown } from './SoundEffectDropdown';
import { NumberReadingDropdown } from './NumberReadingDropdown';
import { PolyphoneDropdown } from './PolyphoneDropdown';
import { VoiceDropdown } from './VoiceDropdown';
import { VoiceSettingsDropdown } from './VoiceSettingsDropdown';
import { getVoiceList, VoiceInfo } from '../services/ttsService';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { pinyin } from 'pinyin-pro';
import { getTextCharCount } from '../utils/textProcessor';
import { useToastContext } from '../contexts/ToastContext';

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

// 保存光标位置
function saveCursorPosition(container: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  return getCursorIndex(container, selection.getRangeAt(0));
}

function restoreCursorPosition(container: HTMLElement, position: number) {
  const target = getDomPosition(container, position);
  if (target) {
    const range = document.createRange();
    range.setStart(target.node, target.offset);
    range.collapse(true);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } else {
    // Fallback: 如果无法定位，尝试定位到最后
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(container);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

export const TextEditor = forwardRef<TextEditorRef, TextEditorProps>(
  ({ placeholder }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const { text, setText, maxLength, addToHistory, historyIndex, locale } = useAppStore();
    const { showToast } = useToastContext();
    const debounceTimerRef = useRef<number | null>(null);
    const prevHistoryIndexRef = useRef<number>(0);
    const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
    const [pauseDropdownPosition, setPauseDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentPauseElement, setCurrentPauseElement] = useState<HTMLElement | null>(null);
    const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
    const [speedDropdownPosition, setSpeedDropdownPosition] = useState({ x: 0, y: 0 });
    const [isSoundEffectDropdownOpen, setIsSoundEffectDropdownOpen] = useState(false);
    const [soundEffectDropdownPosition, setSoundEffectDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentSpeedElement, setCurrentSpeedElement] = useState<HTMLElement | null>(null);
    const [currentSoundElement, setCurrentSoundElement] = useState<HTMLElement | null>(null);
    const [isNumberReadingDropdownOpen, setIsNumberReadingDropdownOpen] = useState(false);
    const [numberReadingDropdownPosition, setNumberReadingDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentNumberElement, setCurrentNumberElement] = useState<HTMLElement | null>(null);
    const [isPolyphoneDropdownOpen, setIsPolyphoneDropdownOpen] = useState(false);
    const [polyphoneDropdownPosition, setPolyphoneDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentPolyphoneElement, setCurrentPolyphoneElement] = useState<HTMLElement | null>(null);
    const [currentPolyphoneOptions, setCurrentPolyphoneOptions] = useState<string[]>([]);
    const [currentPolyphoneChar, setCurrentPolyphoneChar] = useState<string>('');
    const [isVoiceAvatarDropdownOpen, setIsVoiceAvatarDropdownOpen] = useState(false);
    const [voiceAvatarDropdownPosition, setVoiceAvatarDropdownPosition] = useState({ x: 0, y: 0 });
    const [currentVoiceMarker, setCurrentVoiceMarker] = useState<HTMLElement | null>(null);
    const isUpdatingRef = useRef(false);

    // 用于在 DOM 更新后强制设置光标位置
    const pendingCursorTargetRef = useRef<{
      type: 'element-after' | 'position';
      selector?: string;
      index?: number;
      value?: number
    } | null>(null);

    // 将文本渲染为 HTML（locale 变化时重新渲染以更新翻译）
    const renderedHtml = renderTextWithMarkers(text, locale);

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

    // 处理输入前事件 - 检查字数限制
    const handleBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
      if (!editorRef.current) return;

      const currentText = extractTextFromRendered(editorRef.current.innerHTML);
      const currentCharCount = getTextCharCount(currentText);

      // 如果已经达到或超过限制，检查操作类型
      if (currentCharCount >= maxLength) {
        const inputEvent = e.nativeEvent as InputEvent;
        // 允许删除操作
        if (inputEvent.inputType === 'deleteContentBackward' || 
            inputEvent.inputType === 'deleteContentForward' ||
            inputEvent.inputType === 'deleteByDrag' ||
            inputEvent.inputType === 'deleteByCut' ||
            inputEvent.inputType === 'deleteWordBackward' ||
            inputEvent.inputType === 'deleteWordForward') {
          return; // 允许删除
        }
        // 阻止所有其他输入操作并显示提示
        e.preventDefault();
        showToast('已到最大输入字数', 'warning');
        return;
      }

      // 对于插入操作，检查插入后的字数
      const inputEvent = e.nativeEvent as InputEvent;
      if (inputEvent.inputType === 'insertText' || 
          inputEvent.inputType === 'insertCompositionText') {
        const insertedText = inputEvent.data || '';
        if (insertedText) {
          // 计算插入后的字符数（简化计算）
          const remainingChars = maxLength - currentCharCount;
          if (insertedText.length > remainingChars) {
            // 如果插入的文本会超过限制，阻止输入
            // 实际截断会在 handleInput 中处理
            e.preventDefault();
            // 手动插入允许的文本
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const allowedText = insertedText.substring(0, remainingChars);
              const textNode = document.createTextNode(allowedText);
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
              updateTextFromEditor();
            }
            // 显示提示
            if (remainingChars === 0) {
              showToast('已到最大输入字数', 'warning');
            }
            return;
          }
        }
      }
    };

    // 处理输入事件
    const handleInput = () => {
      if (!editorRef.current) return;

      const html = editorRef.current.innerHTML;
      const extractedText = extractTextFromRendered(html);
      const charCount = getTextCharCount(extractedText);

      // 如果超过限制，恢复之前的文本
      if (charCount > maxLength) {
        // 恢复之前的文本内容
        isUpdatingRef.current = true;
        const previousHtml = renderTextWithMarkers(text, locale);
        editorRef.current.innerHTML = previousHtml;
        
        // 恢复光标位置
        const cursorPos = saveCursorPosition(editorRef.current);
        setTimeout(() => {
          restoreCursorPosition(editorRef.current!, cursorPos);
          isUpdatingRef.current = false;
        }, 0);
        return;
      }

      updateTextFromEditor();
    };

    // 处理粘贴事件
    const insertPlainText = (rawText: string) => {
      if (!editorRef.current) return;

      const currentText = extractTextFromRendered(editorRef.current.innerHTML);
      const currentCharCount = getTextCharCount(currentText);
      const remainingChars = maxLength - currentCharCount;

      if (remainingChars <= 0) {
        showToast('已到最大输入字数', 'warning');
        return;
      }

      const allowedText = rawText.substring(0, remainingChars);

      if (rawText.length > remainingChars) {
        showToast('已到最大输入字数', 'warning');
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const textNode = document.createTextNode(allowedText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      updateTextFromEditor();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();

      const pastedText = e.clipboardData.getData('text/plain');
      if (!pastedText) return;

      insertPlainText(pastedText);
    };

    // 处理点击事件 - 检测是否点击了停顿按钮或变速标签
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      console.log('[TextEditor][Click]', {
        targetTag: target.tagName,
        targetClass: target.className,
        targetText: target.textContent?.slice(0, 30) || '',
        insideVoiceWrapper: !!target.closest('.voice-marker-wrapper'),
        insideVoiceContent: !!target.closest('.voice-content'),
        insideCursorAnchor: !!target.closest('.voice-cursor-anchor'),
      });

      // 检查是否点击了停顿关闭按钮
      const pauseClose = target.closest('.pause-close');
      if (pauseClose) {
        e.preventDefault();
        e.stopPropagation();

        const pauseWrapper = pauseClose.closest('.pause-marker-wrapper');
        if (pauseWrapper && editorRef.current) {
          const allPauseWrappers = Array.from(editorRef.current.querySelectorAll('.pause-marker-wrapper'));
          const wrapperIndex = allPauseWrappers.indexOf(pauseWrapper);

          if (wrapperIndex !== -1) {
            const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;
            let matchIndex = 0;
            const newText = text.replace(pauseRegex, (_match) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return ''; // 移除停顿标记
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了停顿箭头
      const pauseArrow = target.closest('[data-pause-arrow="true"]');
      if (pauseArrow) {
        e.preventDefault();
        e.stopPropagation();

        const pauseElement = pauseArrow.closest('.pause-marker-wrapper') as HTMLElement;
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
            let targetCursorPos = -1;

            const newText = text.replace(numberRegex, (_match, _mode, content, offset) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                targetCursorPos = offset + content.length;
                return content; // 只保留内容，移除 number 标签
              }
              matchIndex++;
              return _match;
            });

            if (targetCursorPos !== -1) {
              pendingCursorTargetRef.current = {
                type: 'position',
                value: targetCursorPos
              };
            }

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

      // 检查是否点击了多音字关闭按钮
      const polyphoneClose = target.closest('.polyphone-close');
      if (polyphoneClose) {
        e.preventDefault();
        e.stopPropagation();

        const polyphoneWrapper = polyphoneClose.closest('.polyphone-marker-wrapper');
        if (polyphoneWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.polyphone-marker-wrapper'));
          const wrapperIndex = allWrappers.indexOf(polyphoneWrapper);

          if (wrapperIndex !== -1) {
            const regex = /<polyphone\s+pronunciation=["']([^"']+)["']>([^<]*)<\/polyphone>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match, _pinyin, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content;
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了多音字内容或箭头 (触发修改)
      const polyphoneWrapper = target.closest('.polyphone-marker-wrapper');
      if (polyphoneWrapper) {
        // 如果点击的不是关闭按钮 (前面已经处理)，则打开选择菜单
        e.preventDefault();
        e.stopPropagation();

        const contentEl = polyphoneWrapper.querySelector('.polyphone-content');
        const char = contentEl?.textContent || '';

        if (char) {
          // 获取该字的所有拼音
          const pinyinResult = pinyin(char, {
            pattern: 'pinyin',
            toneType: 'num',
            type: 'array',
            multiple: true
          });

          // 去重
          const uniquePinyins = Array.from(new Set(pinyinResult));

          setCurrentPolyphoneElement(polyphoneWrapper as HTMLElement);
          setCurrentPolyphoneChar(char);
          setCurrentPolyphoneOptions(uniquePinyins);

          const rect = polyphoneWrapper.getBoundingClientRect();
          setPolyphoneDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsPolyphoneDropdownOpen(true);
        }
        return;
      }

      // 检查是否点击了重读标记的关闭按钮
      const rereadClose = target.closest('.reread-close');
      if (rereadClose) {
        e.preventDefault();
        e.stopPropagation();

        const rereadWrapper = rereadClose.closest('.reread-marker-wrapper');
        if (rereadWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.reread-marker-wrapper'));
          const wrapperIndex = allWrappers.indexOf(rereadWrapper);

          if (wrapperIndex !== -1) {
            const regex = /<reread>([^<]*)<\/reread>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 只保留内容，移除 reread 标签
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了音效标记的关闭按钮
      const soundClose = target.closest('.sound-close');
      if (soundClose) {
        e.preventDefault();
        e.stopPropagation();

        const soundWrapper = soundClose.closest('.sound-effect-marker');
        if (soundWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.sound-effect-marker'));
          const wrapperIndex = allWrappers.indexOf(soundWrapper);

          if (wrapperIndex !== -1) {
            // 在原始文本中移除对应的音效标记
            const regex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return ''; // 移除音效标记
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了音效箭头
      const soundArrow = target.closest('[data-sound-arrow="true"]');
      if (soundArrow) {
        e.preventDefault();
        e.stopPropagation();

        const soundWrapper = soundArrow.closest('.sound-effect-marker') as HTMLElement;
        if (soundWrapper) {
          setCurrentSoundElement(soundWrapper);
          const rect = soundArrow.getBoundingClientRect();
          setSoundEffectDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsSoundEffectDropdownOpen(true);
        }
        return;
      }

      // 检查是否点击了发音人标记的关闭按钮
      const voiceClose = target.closest('.voice-close');
      if (voiceClose) {
        e.preventDefault();
        e.stopPropagation();

        const voiceWrapper = voiceClose.closest('.voice-marker-wrapper');
        if (voiceWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.voice-marker-wrapper'));
          const wrapperIndex = allWrappers.indexOf(voiceWrapper);

          if (wrapperIndex !== -1) {
            // 在原始文本中移除对应的发音人标记，保留内容
            const regex = /<voice\s+voice_id=["']([^"']+)["']\s+voice_name=["']([^"']+)["']\s+voice_avatar=["']([^"']*)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/voice>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match, _id, _name, _avatar, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 保留内容，移除voice标签
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了发音人头像（包括图片和后备字符）
      const voiceAvatar = target.closest('.voice-avatar') || target.closest('.voice-avatar-fallback');
      // 或者点击了包含头像的容器（如果点击的是图片或后备字符的父容器）
      const voiceAvatarContainer = target.closest('[class*="relative inline-flex"]')?.querySelector('.voice-avatar');
      const clickedAvatar = voiceAvatar || voiceAvatarContainer;

      if (clickedAvatar) {
        e.preventDefault();
        e.stopPropagation();

        const voiceWrapper = clickedAvatar.closest('.voice-marker-wrapper');
        if (voiceWrapper && editorRef.current) {
          setCurrentVoiceMarker(voiceWrapper as HTMLElement);
          const rect = clickedAvatar.getBoundingClientRect();
          setVoiceAvatarDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 8,
          });
          setIsVoiceAvatarDropdownOpen(true);
        }
        return;
      }

      // 如果点击的不是任何特殊元素，确保焦点正确设置
      // 这样可以防止焦点被困在发音人标记内部
      if (editorRef.current && !target.closest('[contenteditable="false"]')) {
        // 如果点击的是编辑器本身或普通文本区域，确保编辑器获得焦点
        setTimeout(() => {
          if (editorRef.current && !editorRef.current.contains(document.activeElement)) {
            editorRef.current.focus();
          }
        }, 0);
      }

      // 处理点击光标锚点元素的情况，确保光标可以定位到锚点内
      const cursorAnchor = target.closest('.voice-cursor-anchor');
      if (cursorAnchor) {
        const anchorText = (cursorAnchor.textContent || '').replace(/\u200B/g, '');
        console.log('[TextEditor][Click] cursor anchor hit', {
          anchorTextLen: anchorText.length,
          anchorRaw: cursorAnchor.textContent,
        });
        // 如果锚点内已经有真实文本，允许浏览器正常定位光标
        if (anchorText.length > 0) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        // 将光标定位到锚点内的零宽字符之后
        const selection = window.getSelection();
        if (selection) {
          console.log('[TextEditor][Click] force cursor to anchor', {
            rangeCount: selection.rangeCount,
          });
          const range = document.createRange();
          if (cursorAnchor.firstChild) {
            // 在零宽字符之后设置光标
            range.setStart(cursorAnchor.firstChild, 1);
            range.setEnd(cursorAnchor.firstChild, 1);
          } else {
            range.selectNodeContents(cursorAnchor);
            range.collapse(false);
          }
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }

      // 如果点击的是编辑器空白区域，仅在内容为空时进行兜底定位
      if (editorRef.current && target === editorRef.current) {
        console.log('[TextEditor][Click] editor background click');
        const isEmpty =
          !editorRef.current.textContent?.trim() ||
          editorRef.current.innerHTML === '<br>' ||
          editorRef.current.innerHTML === '';
        if (!isEmpty) {
          return;
        }

        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          if (editorRef.current.firstChild) {
            range.setStart(editorRef.current.firstChild, 0);
            range.setEnd(editorRef.current.firstChild, 0);
          } else {
            range.setStart(editorRef.current, 0);
            range.setEnd(editorRef.current, 0);
          }
          selection.removeAllRanges();
          selection.addRange(range);
        }
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

      const editor = editorRef.current;
      const currentHtml = editor.innerHTML;
      const newHtml = renderedHtml;

      if (currentHtml !== newHtml) {
        const prevScrollTop = editor.scrollTop;
        const prevScrollHeight = editor.scrollHeight;

        // 保存光标位置 (如果不是手动指定目标)
        let savedPosition = 0;
        if (!pendingCursorTargetRef.current) {
          savedPosition = saveCursorPosition(editor);
        }

        isUpdatingRef.current = true;
        // 如果内容为空，写入 <br> 以确保光标显示
        if (!newHtml) {
          editor.innerHTML = '<br>';
          // 确保 contentEditable 属性仍然存在
          editor.contentEditable = 'true';
        } else {
          editor.innerHTML = newHtml;
        }

        // 恢复光标位置和滚动位置
        setTimeout(() => {
          if (!editorRef.current) return;

          const el = editorRef.current;

          if (pendingCursorTargetRef.current) {
            const target = pendingCursorTargetRef.current;
            if (target.type === 'element-after' && target.selector && target.index !== undefined) {
              const elements = el.querySelectorAll(target.selector);
              if (elements[target.index]) {
                const range = document.createRange();
                range.setStartAfter(elements[target.index]);
                range.collapse(true);
                const sel = window.getSelection();
                if (sel) {
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }
            } else if (target.type === 'position' && target.value !== undefined) {
              restoreCursorPosition(el, target.value);
            }
            pendingCursorTargetRef.current = null;
          } else if (!newHtml) {
            // 如果是空内容，直接设置光标在开始位置
            const range = document.createRange();
            const sel = window.getSelection();
            if (el.firstChild) {
              range.setStartBefore(el.firstChild);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          } else {
            restoreCursorPosition(el, savedPosition);
          }

          const newScrollHeight = el.scrollHeight;
          const delta = newScrollHeight - prevScrollHeight;
          const targetScrollTop = prevScrollTop + delta;
          el.scrollTop = Math.max(0, targetScrollTop);

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
        editorRef.current.querySelectorAll('.pause-marker-wrapper')
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

    // 处理音效选择
    const handleSoundEffectSelect = (effectId: string) => {
      if (!currentSoundElement || !editorRef.current) return;

      const allSoundWrappers = Array.from(
        editorRef.current.querySelectorAll('.sound-effect-marker')
      ) as HTMLElement[];
      const wrapperIndex = allSoundWrappers.indexOf(currentSoundElement);

      if (wrapperIndex === -1) return;

      const soundRegex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
      let matchIndex = 0;
      const newText = text.replace(soundRegex, (_match, _oldEffect) => {
        if (matchIndex === wrapperIndex) {
          matchIndex++;
          return `<sound effect="${effectId}" />`;
        }
        matchIndex++;
        return _match;
      });

      setText(newText);
      setIsSoundEffectDropdownOpen(false);
      setCurrentSoundElement(null);
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
        // 设置等待光标位置：在当前修改的元素之后
        pendingCursorTargetRef.current = {
          type: 'element-after',
          selector: '.number-marker-wrapper',
          index: wrapperIndex
        };
        setText(newText);
      }

      setIsNumberReadingDropdownOpen(false);
      setCurrentNumberElement(null);
    };

    // 处理发音人头像点击 - 切换发音人
    const handleVoiceAvatarSelect = (voice: VoiceInfo) => {
      if (!currentVoiceMarker || !editorRef.current) return;

      const allWrappers = Array.from(editorRef.current.querySelectorAll('.voice-marker-wrapper'));
      const wrapperIndex = allWrappers.indexOf(currentVoiceMarker);

      if (wrapperIndex === -1) return;

      // 在原始文本中找到对应的 voice 标记并替换
      const voiceRegex = /<voice\s+voice_id=["']([^"']+)["']\s+voice_name=["']([^"']+)["']\s+voice_avatar=["']([^"']*)["']>([\s\S]*?)<\/voice>/g;
      let matchIndex = 0;
      const gender = voice.gender === 'male' || voice.gender === 'female' ? voice.gender : 'male';
      const newAvatar = getVoiceAvatar(voice.id, voice.name, gender);

      const newText = text.replace(voiceRegex, (_match, _oldId, _oldName, _oldAvatar, content) => {
        if (matchIndex === wrapperIndex) {
          matchIndex++;
          // 替换发音人信息，保留内容
          return `<voice voice_id="${voice.id}" voice_name="${voice.name}" voice_avatar="${newAvatar}">${content}</voice>`;
        }
        matchIndex++;
        return _match;
      });

      const newCharCount = getTextCharCount(newText);
      if (newCharCount <= maxLength) {
        setText(newText);
      }

      setIsVoiceAvatarDropdownOpen(false);
      setCurrentVoiceMarker(null);
    };

    // 处理多音字选择
    const handlePolyphoneSelect = (pinyin: string) => {
      if (!currentPolyphoneElement || !editorRef.current) return;

      const allWrappers = Array.from(editorRef.current.querySelectorAll('.polyphone-marker-wrapper'));
      const wrapperIndex = allWrappers.indexOf(currentPolyphoneElement);

      if (wrapperIndex === -1) return;

      const regex = /<polyphone\s+pronunciation=["']([^"']+)["']>([^<]*)<\/polyphone>/g;
      let matchIndex = 0;
      const newText = text.replace(regex, (_match, _oldPinyin, content) => {
        if (matchIndex === wrapperIndex) {
          matchIndex++;
          return `<polyphone pronunciation="${pinyin}">${content}</polyphone>`;
        }
        matchIndex++;
        return _match;
      });

      setText(newText);
      setIsPolyphoneDropdownOpen(false);
      setCurrentPolyphoneElement(null);
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
        if (!editorRef.current) {
          return { start: 0, end: 0, text: '' };
        }

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          const pos = saveCursorPosition(editorRef.current);
          return { start: pos, end: pos, text: '' };
        }

        const range = selection.getRangeAt(0);
        const container = editorRef.current;

        // Calculate start index
        const startRange = document.createRange();
        startRange.setStart(container, 0);
        startRange.setEnd(range.startContainer, range.startOffset);
        const start = getCursorIndex(container, startRange);

        // Calculate end index
        let end = start;
        if (!range.collapsed) {
          const endRange = document.createRange();
          endRange.setStart(container, 0);
          endRange.setEnd(range.endContainer, range.endOffset);
          end = getCursorIndex(container, endRange);
        }

        return { start, end, text: range.toString() };
      },
      setCursorPosition: (position: number) => {
        if (!editorRef.current) return;
        restoreCursorPosition(editorRef.current, position);
        editorRef.current.focus();
      },
      focus: () => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        // 如果内容为空或只有 <br>，确保光标在正确位置
        const isEmpty = !editorRef.current.textContent?.trim() ||
          editorRef.current.innerHTML === '<br>' ||
          editorRef.current.innerHTML === '';

        if (isEmpty) {
          const selection = window.getSelection();
          const range = document.createRange();

          if (editorRef.current.firstChild) {
            range.setStart(editorRef.current.firstChild, 0);
            range.setEnd(editorRef.current.firstChild, 0);
          } else {
            // 如果完全没有子节点，先添加一个 <br>
            const br = document.createElement('br');
            editorRef.current.appendChild(br);
            range.setStartBefore(br);
            range.setEndBefore(br);
          }

          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      },
      getContainer: () => {
        return editorRef.current;
      },
    }));

    return (
      <div className="relative w-full h-full flex flex-col">
        <div
          ref={editorRef}
          contentEditable
          spellCheck={false}
          onBeforeInput={handleBeforeInput}
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          data-placeholder={placeholder}
          className="w-full flex-1 min-h-[400px] max-h-full overflow-y-auto pt-10 pb-6 px-6 bg-transparent border-none outline-none text-gray-800 transition-colors duration-200 text-base leading-[2.6] focus:outline-none"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        />

        {!text && placeholder && (
          <div className="absolute top-10 left-6 pointer-events-none text-gray-400">
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

        {isSoundEffectDropdownOpen && (
          <SoundEffectDropdown
            isOpen={isSoundEffectDropdownOpen}
            onClose={() => {
              setIsSoundEffectDropdownOpen(false);
              setCurrentSoundElement(null);
            }}
            onSelect={handleSoundEffectSelect}
            position={soundEffectDropdownPosition}
          />
        )}

        {/* 多音字下拉菜单 */}
        {isPolyphoneDropdownOpen && (
          <PolyphoneDropdown
            isOpen={isPolyphoneDropdownOpen}
            onClose={() => {
              setIsPolyphoneDropdownOpen(false);
              setCurrentPolyphoneElement(null);
            }}
            onSelect={handlePolyphoneSelect}
            position={polyphoneDropdownPosition}
            options={currentPolyphoneOptions}
            originalChar={currentPolyphoneChar}
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

        {/* 发音人头像下拉菜单 - 显示设置面板 */}
        {isVoiceAvatarDropdownOpen && currentVoiceMarker && (
          <VoiceSettingsDropdown
            isOpen={isVoiceAvatarDropdownOpen}
            onClose={() => {
              setIsVoiceAvatarDropdownOpen(false);
              setCurrentVoiceMarker(null);
            }}
            position={voiceAvatarDropdownPosition}
            voiceId={currentVoiceMarker.getAttribute('data-voice-id') || ''}
            voiceName={currentVoiceMarker.getAttribute('data-voice-name') || ''}
            voiceAvatar={currentVoiceMarker.getAttribute('data-voice-avatar') || ''}
            onVoiceChange={(voiceId, voiceName, voiceAvatar, gender) => {
              handleVoiceAvatarSelect({
                id: voiceId,
                name: voiceName,
                gender: (gender === 'male' || gender === 'female' ? gender : 'male') as 'male' | 'female',
                language: 'zh-CN',
                description: '',
              });
            }}
          />
        )}
      </div>
    );
  }
);

TextEditor.displayName = 'TextEditor';
