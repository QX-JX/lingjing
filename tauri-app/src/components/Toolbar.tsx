import { useState, useRef } from 'react';
import {

  Undo2,
  Redo2,
  Trash2,
  Copy,
  Pause,
  Repeat,
  Hash,
  Users,
  Type,
  Music,
  Music2,
  Upload,
  Clock,
  Sliders,
  Settings,
} from 'lucide-react';
import { useTextEditor } from '../contexts/TextEditorContext';
import { useToastContext } from '../contexts/ToastContext';
import { useAppStore } from '../store/useAppStore';
import { PauseDropdown } from './PauseDropdown';
import { SpeedDropdown } from './SpeedDropdown';
import { NumberReadingDropdown } from './NumberReadingDropdown';
import { VoiceDropdown } from './VoiceDropdown';
import { getVoiceList, VoiceInfo } from '../services/ttsService';
import { copyToClipboard, getTextCharCount } from '../utils/textProcessor';
import { applyMarkerWithDOM, getParentVoiceMarker } from '../utils/markerHelper';
import { PolyphoneDropdown } from './PolyphoneDropdown';
import { SoundEffectDropdown } from './SoundEffectDropdown';
import { BackgroundMusicDropdown } from './BackgroundMusicDropdown';
import { ImportDialog } from './ImportDialog';
import { ClearDropdown } from './ClearDropdown';
import { pinyin } from 'pinyin-pro';
import { extractTextFromRendered, getCursorIndex } from '../utils/textRenderer';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { t } from '../locales';

interface ToolbarButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  showSeparator?: boolean;
}

export function Toolbar() {
  const { textEditorRef, tiptapEditor } = useTextEditor();
  const { showToast } = useToastContext();
  const { text, setText, undo, redo, clearText, history, historyIndex, maxLength, audioConfig, setAudioConfig, toggleHistoryPanel } = useAppStore();
  const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
  const [isNumberReadingDropdownOpen, setIsNumberReadingDropdownOpen] = useState(false);
  const [isPolyphoneDropdownOpen, setIsPolyphoneDropdownOpen] = useState(false);
  const [polyphoneDropdownPosition, setPolyphoneDropdownPosition] = useState({ x: 0, y: 0 });
  const [currentPolyphoneOptions, setCurrentPolyphoneOptions] = useState<string[]>([]);
  const [currentPolyphoneChar, setCurrentPolyphoneChar] = useState<string>('');

  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const numberReadingButtonRef = useRef<HTMLButtonElement>(null);
  const polyphoneButtonRef = useRef<HTMLButtonElement>(null);
  const soundEffectButtonRef = useRef<HTMLButtonElement>(null);
  const lastSoundEffectCursorRef = useRef<number | null>(null);
  const [isSoundEffectDropdownOpen, setIsSoundEffectDropdownOpen] = useState(false);
  const [soundEffectDropdownPosition, setSoundEffectDropdownPosition] = useState({ x: 0, y: 0 });

  const [isBgmDropdownOpen, setIsBgmDropdownOpen] = useState(false);
  const [bgmDropdownPosition, setBgmDropdownPosition] = useState({ x: 0, y: 0 });
  const bgmButtonRef = useRef<HTMLButtonElement>(null);

  const [isClearDropdownOpen, setIsClearDropdownOpen] = useState(false);
  const [clearDropdownPosition, setClearDropdownPosition] = useState({ x: 0, y: 0 });
  const clearButtonRef = useRef<HTMLButtonElement>(null);


  const handleInsertPause = (ms: number) => {
    if (!textEditorRef?.current) return;

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    const selection = window.getSelection();

    // 如果有选中文本，在选中文本后插入停顿
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);

      // 检查是否在发音人标记内
      const voiceMarker = getParentVoiceMarker(selection);

      if (voiceMarker) {
        console.log('[Toolbar] 停顿插入：选区在发音人标记内');

        const voiceId = voiceMarker.getAttribute('data-voice-id') || '';
        const voiceName = voiceMarker.getAttribute('data-voice-name') || '';
        const voiceAvatar = voiceMarker.getAttribute('data-voice-avatar') || '';
        const voiceContent = voiceMarker.querySelector('.voice-content');

        if (!voiceContent) {
          console.error('[Toolbar] 找不到 voice-content');
          setIsPauseDropdownOpen(false);
          return;
        }

        // 在选区结束位置插入停顿标记
        const pauseTag = `<pause ms="${ms}"/>`;

        // 提取选中内容之前的部分（包括选中部分）
        const beforeAndSelectedRange = document.createRange();
        beforeAndSelectedRange.setStart(voiceContent, 0);
        beforeAndSelectedRange.setEnd(range.endContainer, range.endOffset);
        const beforeAndSelectedFragment = beforeAndSelectedRange.cloneContents();
        const beforeAndSelectedDiv = document.createElement('div');
        beforeAndSelectedDiv.appendChild(beforeAndSelectedFragment);
        const beforeAndSelectedHtml = beforeAndSelectedDiv.innerHTML;

        // 提取选中内容之后的部分
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        if (voiceContent.lastChild) {
          afterRange.setEndAfter(voiceContent.lastChild);
        }
        const afterFragment = afterRange.cloneContents();
        const afterDiv = document.createElement('div');
        afterDiv.appendChild(afterFragment);
        const afterHtml = afterDiv.innerHTML;

        const beforeAndSelectedText = extractTextFromRendered(beforeAndSelectedHtml);
        const afterText = extractTextFromRendered(afterHtml);

        const newVoiceContent = beforeAndSelectedText + pauseTag + afterText;

        // 获取整个容器的HTML并替换发音人内容
        const containerHtml = container.innerHTML;
        const fullText = extractTextFromRendered(containerHtml);

        const voiceRegex = new RegExp(
          `<voice\\s+voice_id="${voiceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+voice_name="${voiceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+voice_avatar="${voiceAvatar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([^]*?)<\\/voice>`,
          'g'
        );

        const currentVoiceText = extractTextFromRendered(voiceContent.innerHTML);

        let replaced = false;
        const newText = fullText.replace(voiceRegex, (match, content) => {
          if (!replaced && content === currentVoiceText) {
            replaced = true;
            return `<voice voice_id="${voiceId}" voice_name="${voiceName}" voice_avatar="${voiceAvatar}">${newVoiceContent}</voice>`;
          }
          return match;
        });

        if (!replaced) {
          console.error('[Toolbar] 无法找到匹配的发音人标记');
          setIsPauseDropdownOpen(false);
          return;
        }

        const newCharCount = getTextCharCount(newText);
        if (newCharCount <= maxLength) {
          setText(newText);
          const newPosition = beforeAndSelectedText.length + pauseTag.length;
          setTimeout(() => {
            textarea.setCursorPosition(newPosition);
            textarea.focus();
          }, 0);
        }
      } else {
        // 不在发音人标记内，使用原来的逻辑
        const textSelection = textarea.getSelection();
        const tag = `<pause ms="${ms}"/>`;
        const newText =
          text.slice(0, textSelection.end) +
          tag +
          text.slice(textSelection.end);

        const newCharCount = getTextCharCount(newText);
        if (newCharCount <= maxLength) {
          setText(newText);
          setTimeout(() => {
            const newPosition = textSelection.end + tag.length;
            textarea.setCursorPosition(newPosition);
            textarea.focus();
          }, 0);
        }
      }
    } else {
      // 如果没有选中文本，在光标位置插入
      const tag = `<pause ms="${ms}"/>`;
      textarea.insertSSMLTag(tag);
    }

    setIsPauseDropdownOpen(false);
  };

  const handlePauseButtonClick = () => {
    setIsPauseDropdownOpen(true);
  };

  const handleSpeedButtonClick = () => {
    console.log('[Toolbar] handleSpeedButtonClick - 变速按钮被点击', {
      hasTextEditorRef: !!textEditorRef?.current,
      hasTiptapEditor: !!tiptapEditor
    });

    // 如果 TipTap 编辑器已初始化，检查是否有选中文本
    if (tiptapEditor) {
      const { from, to } = tiptapEditor.state.selection;
      if (from === to) {
        // 没有选中文本
        showToast(t('toast.selectTextForSpeed'), 'warning');
        return;
      }
      // 有选中文本，打开下拉栏
      setIsSpeedDropdownOpen(true);
      return;
    }

    // 使用 contentEditable 编辑器
    if (textEditorRef?.current) {
      const container = textEditorRef.current.getContainer();
      if (!container) {
        console.warn('[Toolbar] 容器不存在');
        return;
      }

      // 检查是否有选中文本
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        showToast(t('toast.selectTextForSpeed'), 'warning');
        return;
      }

      // 有选中文本，打开下拉栏
      setIsSpeedDropdownOpen(true);
      return;
    }

    // 如果没有编辑器实例，直接打开下拉栏（用于全局速度设置）
    setIsSpeedDropdownOpen(true);
  };

  const handleSpeedSelect = (speed: number) => {
    console.log('[Toolbar] handleSpeedSelect 被调用', {
      speed,
      hasTiptapEditor: !!tiptapEditor,
      hasTextEditorRef: !!textEditorRef?.current,
      currentTextLength: text.length
    });

    // 如果 TipTap 编辑器已初始化，变速功能由 SpeedDropdown 内部处理
    if (tiptapEditor) {
      console.log('[Toolbar] TipTap 编辑器已初始化，由 SpeedDropdown 处理');
      return;
    }

    // 使用 contentEditable 编辑器
    if (textEditorRef?.current) {
      console.log('[Toolbar] 使用 textEditorRef');
      const container = textEditorRef.current.getContainer();
      if (!container) {
        console.warn('[Toolbar] 容器不存在');
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        console.log('[Toolbar] 没有选中文本');
        setAudioConfig({ speed });
        return;
      }

      // 直接从 DOM 操作：在选中的内容外包裹速度标记
      // 这样可以避免位置转换的问题
      const range = selection.getRangeAt(0);

      // 如果选中内容在同一个发音人标记内，优先在该标记内部插入速度标签
      // 这样可以避免把 <voice> 标记拆成两段
      const startElement = (range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement) as Element | null;
      const endElement = (range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as Element)
        : range.endContainer.parentElement) as Element | null;

      const startVoiceWrapper = startElement?.closest('.voice-marker-wrapper');
      const endVoiceWrapper = endElement?.closest('.voice-marker-wrapper');

      if (startVoiceWrapper && startVoiceWrapper === endVoiceWrapper) {
        const voiceContent = startVoiceWrapper.querySelector('.voice-content');
        if (voiceContent && voiceContent.contains(range.startContainer) && voiceContent.contains(range.endContainer)) {
          const speedWrapper = document.createElement('span');
          speedWrapper.setAttribute('data-speed', String(speed));

          try {
            speedWrapper.appendChild(range.extractContents());
          } catch (error) {
            console.warn('[Toolbar] 变速插入失败，回退到普通流程', error);
          }

          range.insertNode(speedWrapper);

          const postRange = document.createRange();
          postRange.setStartAfter(speedWrapper);
          postRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(postRange);

          const cursorPos = textEditorRef.current.getCursorPosition();
          const updatedText = extractTextFromRendered(container.innerHTML);
          const newCharCount = getTextCharCount(updatedText);

          if (newCharCount <= maxLength) {
            setText(updatedText);
            setTimeout(() => {
              textEditorRef.current?.setCursorPosition(cursorPos);
              textEditorRef.current?.focus();
            }, 0);
          } else {
            showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
          }
          return;
        }
      }

      // 获取当前容器的 HTML
      const currentHtml = container.innerHTML;
      const currentText = extractTextFromRendered(currentHtml);

      console.log('[Toolbar] 当前文本:', currentText.substring(0, 100) + '...');

      // 检查 Range 是否包含多个不连续的文本块
      // 如果 Range 跨越了多个元素，可能会导致问题
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      // 检查是否选择了不连续的内容（选择跨越了标记元素）
      if (startContainer !== endContainer ||
        (startContainer.nodeType !== Node.TEXT_NODE && endContainer.nodeType !== Node.TEXT_NODE)) {
        // 检查 Range 中是否包含 contentEditable="false" 的元素（标记元素）
        const clonedContents = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(clonedContents);
        const hasMarkers = tempDiv.querySelector('[contenteditable="false"]');

        if (hasMarkers) {
          console.warn('[Toolbar] 选择跨越了标记元素，可能包含中间内容');
          // 提示用户选择可能不精确
        }
      }

      // 获取选中部分的纯文本
      const selectedPlainText = range.toString();
      console.log('[Toolbar] 选中纯文本:', selectedPlainText);

      if (!selectedPlainText || selectedPlainText.trim().length === 0) {
        console.log('[Toolbar] 选中的是空文本或标记元素');
        setAudioConfig({ speed });
        return;
      }

      // 新方法：直接使用 Range 来分割 DOM，避免位置转换的复杂性
      // 问题：当存在标记（如 <reread>）时，DOM 位置（排除标记元素）和 HTML 文本位置（包含标记）不一致
      // 解决：使用 Range API 精确提取选中内容前后的 HTML，然后重新组合

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
      afterRange.setEndAfter(container.lastChild!);
      const afterFragment = afterRange.cloneContents();
      const afterDiv = document.createElement('div');
      afterDiv.appendChild(afterFragment);
      const afterHtml = afterDiv.innerHTML;

      console.log('[Toolbar] DOM 分段:', {
        beforeHtml: beforeHtml.substring(0, 80),
        selectedHtml: selectedHtml.substring(0, 80),
        afterHtml: afterHtml.substring(0, 80)
      });

      // 4. 从 HTML 片段中提取文本表示（保留所有标记）
      const beforeText = extractTextFromRendered(beforeHtml);
      const selectedText = extractTextFromRendered(selectedHtml);
      const afterText = extractTextFromRendered(afterHtml);

      console.log('[Toolbar] 提取的文本:', {
        beforeText: beforeText.substring(0, 50),
        selectedText: selectedText,
        afterText: afterText.substring(0, 50)
      });

      // 5. 验证选中的纯文本是否匹配
      const selectedTextPlain = selectedText.replace(/<[^>]+>/g, '');
      if (selectedTextPlain !== selectedPlainText) {
        console.error('[Toolbar] 选中文本验证失败', {
          expected: selectedPlainText,
          actual: selectedTextPlain,
          selectedText
        });
        showToast(t('toast.selectTextForSpeed'), 'error');
        return;
      }

      // 6. 构建新文本：before + <speed>selected</speed> + after
      const speedTag = `<speed rate="${speed}">${selectedText}</speed>`;
      const newText = beforeText + speedTag + afterText;

      console.log('[Toolbar] 构建新文本:', {
        beforeLength: beforeText.length,
        speedTagLength: speedTag.length,
        afterLength: afterText.length,
        newTextPreview: newText.substring(0, 100) + ' ...',
        totalLength: newText.length
      });

      // 计算新的光标位置（在 speed 标签之后）
      const newPosition = beforeText.length + speedTag.length;

      const newCharCount = getTextCharCount(newText);
      console.log('[Toolbar] 字符数检查:', { newCharCount, maxLength, isValid: newCharCount <= maxLength });

      if (newCharCount <= maxLength) {
        console.log('[Toolbar] 设置新文本');
        setText(newText);
        setTimeout(() => {
          console.log('[Toolbar] 恢复光标位置:', newPosition);
          textEditorRef.current?.setCursorPosition(newPosition);
          textEditorRef.current?.focus();
        }, 0);
      } else {
        console.error('[Toolbar] 文本长度超出限制');
        showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
      }
      return;
    }

    // 如果没有选中文本，设置为全局音频配置速度
    console.log('[Toolbar] 设置为全局音频配置速度:', speed);
    setAudioConfig({ speed });
  };

  const handleUndo = () => {
    undo();
    textEditorRef?.current?.focus();
  };

  const handleRedo = () => {
    redo();
    textEditorRef?.current?.focus();
  };

  const handleCopy = async () => {
    if (getTextCharCount(text) === 0) {
      showToast(t('toast.noText'), 'warning');
      return;
    }
    const success = await copyToClipboard(text);
    if (success) {
      showToast(t('toast.copied'), 'info');
    } else {
      showToast(t('toast.copyFailed'), 'error');
    }
  };



  // 重读功能（强调/重音）
  const handleReread = async () => {
    console.log('[Toolbar] handleReread - 重读按钮被点击');

    if (!textEditorRef?.current) {
      showToast(t('toast.editorNotInitialized'), 'error');
      return;
    }

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 检查是否有选中文本
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      showToast(t('toast.selectTextForReread'), 'warning');
      return;
    }

    const selectedPlainText = selection.toString();

    // 验证选中的文本是否为纯中文
    const isChinese = /^[\u4e00-\u9fa5]+$/.test(selectedPlainText);

    if (!isChinese) {
      showToast(t('toast.onlyChinese'), 'warning');
      return;
    }

    // 使用 DOM Range API 精确地添加重读标记
    const result = applyMarkerWithDOM(
      container,
      selection,
      'reread',
      {}, // reread 标记没有属性
      extractTextFromRendered
    );

    if (!result) {
      showToast(t('toast.selectTextForReread') + ' (无法应用标记)', 'error');
      return;
    }

    const { newText, newPosition } = result;
    const newCharCount = getTextCharCount(newText);

    console.log('[Toolbar] 字符数检查:', { newCharCount, maxLength, isValid: newCharCount <= maxLength });

    if (newCharCount <= maxLength) {
      console.log('[Toolbar] 设置新文本');
      setText(newText);
      setTimeout(() => {
        console.log('[Toolbar] 恢复光标位置:', newPosition);
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      console.error('[Toolbar] 文本长度超出限制');
      showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
    }
  };

  // 数字读法按钮点击
  const handleNumberReadingButtonClick = () => {
    console.log('[Toolbar] handleNumberReadingButtonClick - 数字读法按钮被点击', {
      hasTextEditorRef: !!textEditorRef?.current,
      hasTiptapEditor: !!tiptapEditor
    });

    // 如果 TipTap 编辑器已初始化，检查是否有选中文本
    if (tiptapEditor) {
      const { from, to } = tiptapEditor.state.selection;
      if (from === to) {
        // 没有选中文本
        showToast(t('toast.selectNumber'), 'warning');
        return;
      }
      // 有选中文本，打开下拉栏
      setIsNumberReadingDropdownOpen(true);
      return;
    }

    // 使用 contentEditable 编辑器
    if (textEditorRef?.current) {
      const container = textEditorRef.current.getContainer();
      if (!container) {
        console.warn('[Toolbar] 容器不存在');
        return;
      }

      // 检查是否有选中文本
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        showToast(t('toast.selectNumber'), 'warning');
        return;
      }

      // 有选中文本，打开下拉栏
      setIsNumberReadingDropdownOpen(true);
      return;
    }

    // 如果没有编辑器实例，直接打开下拉栏
    setIsNumberReadingDropdownOpen(true);
  };

  // 数字读法选择处理
  const handleNumberReadingSelect = async (mode: string) => {
    console.log('[Toolbar] handleNumberReadingSelect - 数字读法选择', { mode });

    if (!textEditorRef?.current) {
      showToast(t('toast.editorNotInitialized'), 'error');
      return;
    }

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 检查是否有选中文本
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      showToast(t('toast.selectNumber'), 'warning');
      return;
    }

    const selectedPlainText = selection.toString();

    // 验证选中的文本是否为数字（允许小数点和负号）
    const isNumber = /^-?\d+(\.\d+)?$/.test(selectedPlainText.trim());

    if (!isNumber) {
      showToast(t('toast.onlyNumber'), 'warning');
      return;
    }

    // 使用 DOM Range API 精确地添加数字读法标记
    const result = applyMarkerWithDOM(
      container,
      selection,
      'number',
      { mode }, // number 标记有 mode 属性
      extractTextFromRendered
    );

    if (!result) {
      showToast(t('toast.selectNumber') + ' (无法应用标记)', 'error');
      return;
    }

    const { newText, newPosition } = result;
    const newCharCount = getTextCharCount(newText);

    console.log('[Toolbar] 字符数检查:', { newCharCount, maxLength, isValid: newCharCount <= maxLength });

    if (newCharCount <= maxLength) {
      console.log('[Toolbar] 设置新文本');
      setText(newText);
      setTimeout(() => {
        console.log('[Toolbar] 恢复光标位置:', newPosition);
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      console.error('[Toolbar] 文本长度超出限制');
      showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
    }

    setIsNumberReadingDropdownOpen(false);
  };

  const getNumberReadingDropdownPosition = () => {
    if (!numberReadingButtonRef.current) return { x: 0, y: 0 };
    const rect = numberReadingButtonRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    };
  };

  // 多音字功能
  const handlePolyphonic = async () => {
    if (!textEditorRef?.current) {
      return;
    }
    const textarea = textEditorRef.current;

    const selection = textarea.getSelection();

    // 检查是否有选中文本
    if (selection.start === selection.end) {
      showToast(t('toast.selectChar'), 'warning');
      return;
    }

    const selectedText = selection.text.trim();

    // 检查是否单字
    if (selectedText.length !== 1) {
      showToast(t('toast.singleCharOnly'), 'warning');
      return;
    }

    // 检查是否为汉字
    if (!/[\u4e00-\u9fa5]/.test(selectedText)) {
      showToast(t('toast.selectChineseChar'), 'warning');
      return;
    }

    // 获取拼音
    const pinyinResult = pinyin(selectedText, {
      pattern: 'pinyin',
      toneType: 'num',
      type: 'array',
      multiple: true
    });

    // 去重
    const uniquePinyins = Array.from(new Set(pinyinResult));

    if (uniquePinyins.length <= 1) {
      showToast(t('toast.notPolyphone'), 'info');
      return;
    }

    // 显示下拉框
    setCurrentPolyphoneChar(selectedText);
    setCurrentPolyphoneOptions(uniquePinyins);

    if (polyphoneButtonRef.current) {
      const rect = polyphoneButtonRef.current.getBoundingClientRect();
      setPolyphoneDropdownPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      });
      setIsPolyphoneDropdownOpen(true);
    }
  };

  const handlePolyphoneSelect = (pronunciation: string) => {
    console.log('[Toolbar] handlePolyphoneSelect - 多音字选择', { pronunciation });

    if (!textEditorRef?.current) return;
    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 使用 DOM Range API 精确地添加多音字标记
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      console.warn('[Toolbar] 没有选中文本');
      return;
    }

    const result = applyMarkerWithDOM(
      container,
      selection,
      'polyphone',
      { pronunciation }, // polyphone 标记有 pronunciation 属性
      extractTextFromRendered
    );

    if (!result) {
      console.error('[Toolbar] 无法应用多音字标记');
      return;
    }

    const { newText, newPosition } = result;
    const newCharCount = getTextCharCount(newText);

    console.log('[Toolbar] 字符数检查:', { newCharCount, maxLength, isValid: newCharCount <= maxLength });

    if (newCharCount <= maxLength) {
      console.log('[Toolbar] 设置新文本');
      setText(newText);
      setTimeout(() => {
        console.log('[Toolbar] 恢复光标位置:', newPosition);
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      console.error('[Toolbar] 文本长度超出限制');
    }

    setIsPolyphoneDropdownOpen(false);
  };

  // 特效音功能
  const handleSoundEffectClick = () => {
    const cursor = textEditorRef?.current?.getCursorPosition();
    console.log('[Toolbar] handleSoundEffectClick - 特效音按钮被点击, 当前光标位置:', cursor);
    if (typeof cursor === 'number') {
      lastSoundEffectCursorRef.current = cursor;
    }
    if (soundEffectButtonRef.current) {
      const rect = soundEffectButtonRef.current.getBoundingClientRect();
      setSoundEffectDropdownPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      });
      setIsSoundEffectDropdownOpen(true);
    }
  };

  const handleSoundEffectSelect = (effectId: string) => {
    console.log('[Toolbar] handleSoundEffectSelect - 选择音效', { effectId });

    if (!textEditorRef?.current) {
      console.warn('[Toolbar] textEditorRef.current 不存在');
      return;
    }

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 优先从 DOM 获取当前选区，避免使用过期的缓存
    const selection = window.getSelection();
    let textSelection = { start: 0, end: 0, text: '' };
    let cursorPosition = 0;
    
    // 如果当前有有效的选区，直接使用它来计算位置
    if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (container.contains(currentRange.commonAncestorContainer)) {
        // 当前有有效选区，使用它
        textSelection = textarea.getSelection();
        cursorPosition = textSelection.end;
      } else {
        // 当前选区不在编辑器内，尝试从 getSelection 获取（可能会使用缓存）
        textSelection = textarea.getSelection();
        cursorPosition = textarea.getCursorPosition();
      }
    } else {
      // 没有当前选区，尝试从 getSelection 获取（可能会使用缓存）
      textSelection = textarea.getSelection();
      cursorPosition = textarea.getCursorPosition();
    }

    console.log('[Toolbar] 特效音插入 - 初始状态:', {
      cursorPosition,
      textSelection,
      hasSelection: !!selection,
      rangeCount: selection?.rangeCount || 0,
      isCollapsed: selection?.isCollapsed ?? true,
      currentTextLength: text.length,
      currentTextPreview: text.substring(0, 50)
    });

    // 如果有选中文本，在选中文本后插入音效
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);

      // 检查是否在发音人标记内
      const voiceMarker = getParentVoiceMarker(selection);

      if (voiceMarker) {
        console.log('[Toolbar] 音效插入：选区在发音人标记内');

        const voiceId = voiceMarker.getAttribute('data-voice-id') || '';
        const voiceName = voiceMarker.getAttribute('data-voice-name') || '';
        const voiceAvatar = voiceMarker.getAttribute('data-voice-avatar') || '';
        const voiceContent = voiceMarker.querySelector('.voice-content');

        if (!voiceContent) {
          console.error('[Toolbar] 找不到 voice-content');
          setIsSoundEffectDropdownOpen(false);
          return;
        }

        // 在选区结束位置插入音效标记
        const soundTag = `<sound effect="${effectId}" />`;

        console.log('[Toolbar] 特效音插入 - 发音人标记内:', {
          voiceId,
          voiceName,
          rangeStartContainer: range.startContainer.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : 'ELEMENT_NODE',
          rangeStartOffset: range.startOffset,
          rangeEndContainer: range.endContainer.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : 'ELEMENT_NODE',
          rangeEndOffset: range.endOffset,
          selectedText: range.toString()
        });

        // 提取选中内容之前的部分（包括选中部分）
        const beforeAndSelectedRange = document.createRange();
        beforeAndSelectedRange.setStart(voiceContent, 0);
        beforeAndSelectedRange.setEnd(range.endContainer, range.endOffset);
        const beforeAndSelectedFragment = beforeAndSelectedRange.cloneContents();
        const beforeAndSelectedDiv = document.createElement('div');
        beforeAndSelectedDiv.appendChild(beforeAndSelectedFragment);
        const beforeAndSelectedHtml = beforeAndSelectedDiv.innerHTML;

        // 提取选中内容之后的部分
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        if (voiceContent.lastChild) {
          afterRange.setEndAfter(voiceContent.lastChild);
        }
        const afterFragment = afterRange.cloneContents();
        const afterDiv = document.createElement('div');
        afterDiv.appendChild(afterFragment);
        const afterHtml = afterDiv.innerHTML;

        const beforeAndSelectedText = extractTextFromRendered(beforeAndSelectedHtml);
        const afterText = extractTextFromRendered(afterHtml);

        console.log('[Toolbar] 特效音插入 - 文本分段:', {
          beforeAndSelectedTextLength: beforeAndSelectedText.length,
          beforeAndSelectedTextPreview: beforeAndSelectedText.substring(0, 50),
          afterTextLength: afterText.length,
          afterTextPreview: afterText.substring(0, 50),
          soundTag,
          newVoiceContentLength: beforeAndSelectedText.length + soundTag.length + afterText.length
        });

        const newVoiceContent = beforeAndSelectedText + soundTag + afterText;

        // 获取整个容器的HTML并替换发音人内容
        const containerHtml = container.innerHTML;
        const fullText = extractTextFromRendered(containerHtml);

        const voiceRegex = new RegExp(
          `<voice\\s+voice_id="${voiceId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+voice_name="${voiceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+voice_avatar="${voiceAvatar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([^]*?)<\\/voice>`,
          'g'
        );

        const currentVoiceText = extractTextFromRendered(voiceContent.innerHTML);

        let replaced = false;
        const newText = fullText.replace(voiceRegex, (match, content) => {
          if (!replaced && content === currentVoiceText) {
            replaced = true;
            return `<voice voice_id="${voiceId}" voice_name="${voiceName}" voice_avatar="${voiceAvatar}">${newVoiceContent}</voice>`;
          }
          return match;
        });

        if (!replaced) {
          console.error('[Toolbar] 无法找到匹配的发音人标记');
          setIsSoundEffectDropdownOpen(false);
          return;
        }

        const newCharCount = getTextCharCount(newText);
        console.log('[Toolbar] 特效音插入 - 发音人标记内结果:', {
          newTextLength: newText.length,
          newCharCount,
          maxLength,
          newPosition: beforeAndSelectedText.length + soundTag.length,
          newTextPreview: newText.substring(0, 100)
        });

        if (newCharCount <= maxLength) {
          setText(newText);
          const newPosition = beforeAndSelectedText.length + soundTag.length;
          setTimeout(() => {
            textarea.setCursorPosition(newPosition);
            const actualPosition = textarea.getCursorPosition();
            console.log('[Toolbar] 特效音插入 - 光标位置设置:', {
              expectedPosition: newPosition,
              actualPosition,
              textAtPosition: newText.substring(Math.max(0, newPosition - 10), newPosition + 20),
              soundTagPosition: newText.indexOf(soundTag)
            });
            textarea.focus();
          }, 0);
        } else {
          showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
        }
      } else {
        // 不在发音人标记内，使用原来的逻辑
        const textSelection = textarea.getSelection();
        const tag = `<sound effect="${effectId}" />`;

        console.log('[Toolbar] 特效音插入 - 不在发音人标记内:', {
          textSelection,
          insertPosition: textSelection.end,
          textBeforeInsert: text.substring(0, textSelection.end),
          textAfterInsert: text.substring(textSelection.end),
          tag
        });

        const newText =
          text.slice(0, textSelection.end) +
          tag +
          text.slice(textSelection.end);

        const newCharCount = getTextCharCount(newText);
        console.log('[Toolbar] 特效音插入 - 不在发音人标记内结果:', {
          newTextLength: newText.length,
          newCharCount,
          maxLength,
          newPosition: textSelection.end + tag.length,
          newTextPreview: newText.substring(0, 100),
          soundTagPosition: newText.indexOf(tag)
        });

        if (newCharCount <= maxLength) {
          setText(newText);
          setTimeout(() => {
            const newPosition = textSelection.end + tag.length;
            textarea.setCursorPosition(newPosition);
            const actualPosition = textarea.getCursorPosition();
            console.log('[Toolbar] 特效音插入 - 光标位置设置:', {
              expectedPosition: newPosition,
              actualPosition,
              textAtPosition: newText.substring(Math.max(0, newPosition - 10), newPosition + 20),
              soundTagPosition: newText.indexOf(tag)
            });
            textarea.focus();
          }, 0);
        } else {
          showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
        }
      }
    } else {
      // 如果没有选中文本，在光标位置插入
      const tag = `<sound effect="${effectId}" />`;

      console.log('[Toolbar] 特效音插入 - 无选中文本 - 开始:', {
        cursorPosition,
        textSelection,
        tag,
        textLength: text.length,
        textPreview: text.substring(0, 100),
        textAtCursor: text.substring(Math.max(0, cursorPosition - 10), cursorPosition + 10)
      });

      const container = textarea.getContainer();
      if (!container) {
        console.error('[Toolbar] 容器不存在，无法插入');
        setIsSoundEffectDropdownOpen(false);
        return;
      }

      // 关键修复：使用与 TextEditor.saveCursorPosition 相同的逻辑计算位置
      // 这样可以正确处理所有标记（重读、变速、多音字、停顿、数字读法等）
      const selection = window.getSelection();
      let insertPosition = text.length; // 默认插入到末尾
      let visibleCursorIndex = 0; // 用于设置光标位置的可见文本索引
      const preferredCursor = typeof lastSoundEffectCursorRef.current === 'number'
        ? lastSoundEffectCursorRef.current
        : null;

      if (preferredCursor !== null) {
        visibleCursorIndex = preferredCursor;
        insertPosition = preferredCursor;
      } else if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const isRangeInContainer = container.contains(range.endContainer);
        if (isRangeInContainer) {
          const cursorIndex = getCursorIndex(container, range);
          visibleCursorIndex = cursorIndex;
          insertPosition = cursorIndex;
          
          console.log('[Toolbar] 特效音插入 - 使用 getCursorIndex:', {
            cursorIndex,
            insertPosition,
            textLength: text.length
          });
        } else {
          console.log('[Toolbar] 特效音插入 - DOM Range信息:', {
          startContainerType: range.startContainer.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : 'ELEMENT_NODE',
          startContainerName: range.startContainer.nodeName,
          startOffset: range.startOffset,
          endContainerType: range.endContainer.nodeType === Node.TEXT_NODE ? 'TEXT_NODE' : 'ELEMENT_NODE',
          endContainerName: range.endContainer.nodeName,
          endOffset: range.endOffset,
          isCollapsed: range.collapsed
          });

        // 使用 TreeWalker 计算位置（与 TextEditor.saveCursorPosition 相同的逻辑）
        // 这样可以正确跳过所有标记元素
        const createEditableNodeFilter = (): NodeFilter => {
          return {
            acceptNode: (node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                // 跳过明确标记为不可编辑的元素
                if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') === 'false') {
                  // 特殊处理：对于包含文本内容的标记包装器，使用 FILTER_SKIP 以便遍历其子节点（如其中的文本内容）
                  if (el.classList.contains('reread-marker-wrapper') ||
                    el.classList.contains('speed-marker-wrapper') ||
                    el.classList.contains('number-marker-wrapper') ||
                    el.classList.contains('polyphone-marker-wrapper')) {
                    return NodeFilter.FILTER_SKIP;
                  }
                  return NodeFilter.FILTER_REJECT;
                }
                // 跳过所有标记元素（这些元素在渲染时显示，但不参与文本位置计算）
                // 包括：发音人标记、重读标记、多音字标记、数字读法标记、变速标记、停顿标记、特效音标记
                if (el.classList.contains('voice-avatar') ||
                  el.classList.contains('voice-avatar-fallback') ||
                  el.classList.contains('voice-close') ||
                  el.classList.contains('voice-marker-wrapper') ||
                  el.classList.contains('reread-badge') ||
                  el.classList.contains('polyphone-pinyin-badge') ||
                  el.classList.contains('polyphone-close') ||
                  el.classList.contains('number-mode-badge') ||
                  el.classList.contains('number-close') ||
                  el.classList.contains('speed-badge') ||
                  el.classList.contains('sound-effect-marker')) {
                  return NodeFilter.FILTER_REJECT;
                }
                // 对于光标锚点元素，跳过元素本身但处理子节点
                if (el.hasAttribute('data-cursor-anchor') || el.classList.contains('voice-cursor-anchor')) {
                  return NodeFilter.FILTER_SKIP;
                }
              }
              // 跳过只包含零宽字符的文本节点
              if (node.nodeType === Node.TEXT_NODE) {
                const textContent = node.textContent || '';
                if (textContent === '\u200B') {
                  return NodeFilter.FILTER_REJECT;
                }
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          };
        };

        // 计算文本长度时排除零宽字符
        const getTextLengthExcludingZeroWidth = (text: string): number => {
          return text.replace(/\u200B/g, '').length;
        };

        // 计算偏移量时排除零宽字符
        const getOffsetExcludingZeroWidth = (text: string, offset: number): number => {
          let realOffset = 0;
          let charCount = 0;
          for (let i = 0; i < offset && i < text.length; i++) {
            if (text[i] !== '\u200B') {
              charCount++;
            }
            realOffset++;
          }
          return charCount;
        };

        // 如果选区在容器元素上（光标在两个节点之间），直接计算前面所有节点的 HTML 长度
        if (range.endContainer === container || range.endContainer.nodeName === 'DIV') {
          let htmlPosition = 0;
          const childNodes = range.endContainer.childNodes;

          // 计算到光标位置（range.endOffset）的所有节点的 HTML 长度
          // range.endOffset 表示光标在第几个子节点之后
          for (let i = 0; i < range.endOffset; i++) {
            const node = childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
              htmlPosition += (node.textContent || '').length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              htmlPosition += (node as Element).outerHTML.length;
            }
          }

          // 对于 DIV 容器选区，TreeWalker 计算的 plainTextPosition 可能不准确（因为它跳过了标签），
          // 所以我们需要手动计算 visibleCursorIndex 用于恢复光标
          let visibleCount = 0;
          for (let i = 0; i < range.endOffset; i++) {
            const node = childNodes[i];
            if (node.nodeType === Node.TEXT_NODE) {
              // 排除零宽字符
              visibleCount += (node.textContent || '').replace(/\u200B/g, '').length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // 如果是可编辑元素（如发音人标记包裹的内容），需要递归计算？？
              // 现在的架构中，发音人标记等 contenteditable=false 元素内部的文本通常由 TreeWalker 处理
              // 但在这里我们手动处理。简单起见，如果前面的元素是 zero-width tags (sound/pause)，visibleCount 不变
              // 如果是包含文本的标记（reread等），我们需要提取文本长度
              const el = node as Element;
              if (el.classList.contains('reread-marker-wrapper') ||
                el.classList.contains('speed-marker-wrapper') ||
                el.classList.contains('number-marker-wrapper') ||
                el.classList.contains('polyphone-marker-wrapper') ||
                el.classList.contains('voice-marker-wrapper')) {
                const textContent = extractTextFromRendered(el.outerHTML);
                visibleCount += textContent.length;
              }
              // 注意：特效音标记（sound-effect-marker）不占用可见文本位置，所以不增加 visibleCount
            }
          }

          visibleCursorIndex = visibleCount;
          insertPosition = htmlPosition;

          console.log('[Toolbar] 特效音插入 - 容器选区直接计算:', {
            rangeEndOffset: range.endOffset,
            insertPosition,
            visibleCursorIndex,
            childNodesCount: childNodes.length,
            nodesBeforeCursor: Array.from(childNodes).slice(0, range.endOffset).map(n => ({
              type: n.nodeType === Node.TEXT_NODE ? 'TEXT' : 'ELEMENT',
              name: n.nodeName,
              isSoundMarker: n.nodeType === Node.ELEMENT_NODE && (n as Element).classList.contains('sound-effect-marker')
            }))
          });

        } else {
          // 原有的 TreeWalker 逻辑，用于 TextNode 内部选区
          // 使用 TreeWalker 计算位置
          let position = 0;
          const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            createEditableNodeFilter()
          );

          let node;
          while ((node = walker.nextNode())) {
            if (node === range.endContainer) {
              if (node.nodeType === Node.TEXT_NODE) {
                const textContent = node.textContent || '';
                position += getOffsetExcludingZeroWidth(textContent, range.endOffset);
              }
              break;
            }
            if (node.nodeType === Node.TEXT_NODE) {
              position += getTextLengthExcludingZeroWidth(node.textContent || '');
            }
          }

          // TreeWalker 计算的是纯文本位置，需要映射到原始文本（包含标签）的位置
          // 创建一个函数将纯文本位置映射到原始文本位置
          const mapPlainTextPositionToOriginal = (plainTextPos: number, originalText: string): number => {
            let plainTextCount = 0;
            let inTag = false;

            for (let i = 0; i < originalText.length; i++) {
              if (originalText[i] === '<') {
                inTag = true;
              } else if (originalText[i] === '>') {
                inTag = false;
                continue; // 跳过 '>'
              }

              if (!inTag) {
                plainTextCount++;
                if (plainTextCount >= plainTextPos) {
                  // 找到目标字符位置 i
                  // 检查后面是否紧跟着不占用文本的标签（如 sound, pause）
                  // 如果由于 maplogic 是 "insert BEFORE next char"，我们需要确保 next char 不是 tag

                  // 简单修复：如果我们在末尾（plainTextPos == total），loop finishes return length which is correct.
                  // 如果我们在中间，return i + 1.
                  // 如果 i+1 开始了一个 tag... 我们是否应该跳过它？
                  // 这取决于 TreeWalker 的 behavior。TreeWalker SKIPs tags.
                  // 所以 plainTextPos 是 "Before Tag" 和 "After Tag" 是一样的。
                  // 但是，如果我们在 TextNode 内部（这个 else 分支），我们肯定是在 Text 字符之间。
                  // 除非 selection 在 TextNode 的边界？
                  return i + 1;
                }
              }
            }

            // 如果纯文本位置超出，返回文本末尾
            return originalText.length;
          };

          const plainTextPosition = position;
          visibleCursorIndex = plainTextPosition; // 记录可见文本索引
          insertPosition = mapPlainTextPositionToOriginal(plainTextPosition, text);

          console.log('[Toolbar] 特效音插入 - TreeWalker计算 (User in TextNode):', {
            plainTextPosition,
            insertPosition
          });
        }

        // 验证计算出的位置是否合理
        // 如果与 textSelection.end 差异过大，通常是因为存在隐藏标签（如 speed, voice 等）
        // 这种情况下 TreeWalker 计算出的 source HTML index 实际上是正确的，而 textSelection.end 只是 visible text index
        // 所以我们应该信任 TreeWalker 的结果，而不是强制重置为 textSelection.end
        const positionDiffFromSelection = Math.abs(insertPosition - textSelection.end);
        if (positionDiffFromSelection > 10 && textSelection.end > 0) {
          console.log('[Toolbar] 特效音插入 - TreeWalker位置与Selection存在差异 (符合预期):', {
            treeWalkerPosition: insertPosition,
            selectionEnd: textSelection.end,
            diff: positionDiffFromSelection
          });
        }
        }
      } else {
        // 如果没有选择范围，使用 getCursorPosition 的结果
        const cursorPos = cursorPosition > 0 ? cursorPosition : text.length;
        insertPosition = cursorPos;
        // 注意：这里我们假设 insertPosition (visible) 可以用于 slice (HTML)，这在有标签时其实是不安全的
        // 但这是现有的 fallback 逻辑。我们需要确保 visibleCursorIndex 也被设置。
        visibleCursorIndex = cursorPos;
        console.warn('[Toolbar] 特效音插入 - 无法获取选择范围，使用光标位置:', insertPosition);
      }

      // 确保 insertPosition 在有效范围内
      insertPosition = Math.max(0, Math.min(insertPosition, text.length));

      // 验证插入位置不会破坏现有标签
      // 检查插入位置是否在标签内部（需要更精确的检查）
      const textBeforeInsert = text.substring(0, insertPosition);
      const textAfterInsert = text.substring(insertPosition);

      // 检查是否在标签中间：如果前面有未闭合的 <，后面有对应的 >
      const lastOpenTag = textBeforeInsert.lastIndexOf('<');
      const lastCloseTag = textBeforeInsert.lastIndexOf('>');

      if (lastOpenTag > lastCloseTag) {
        // 前面有未闭合的 <，检查后面是否有对应的 >
        const nextCloseTag = textAfterInsert.indexOf('>');
        if (nextCloseTag !== -1) {
          // 检查从 lastOpenTag 到 nextCloseTag 之间是否是一个完整的标签
          const potentialTag = text.substring(lastOpenTag, insertPosition + nextCloseTag + 1);
          // 验证是否真的是标签（包含标签名和可能的属性）
          // 匹配标签格式：<tag ...> 或 <tag .../>
          const tagMatch = potentialTag.match(/^<(\w+)(\s+[^>]*)?\/?>$/);
          if (tagMatch) {
            // 确实是一个标签，调整到标签结束位置之后
            insertPosition = insertPosition + nextCloseTag + 1;
            console.log('[Toolbar] 特效音插入 - 检测到在标签中间，调整位置:', {
              originalPosition: insertPosition - nextCloseTag - 1,
              adjustedPosition: insertPosition,
              tagName: tagMatch[1],
              potentialTag: potentialTag.substring(0, 50)
            });
          } else {
            // 不是有效的标签，可能是文本中的 < 和 >，不需要调整
            console.log('[Toolbar] 特效音插入 - 检测到 < 和 > 但不是有效标签，不调整位置');
          }
        }
      }

      // 再次确保位置有效
      insertPosition = Math.max(0, Math.min(insertPosition, text.length));

      console.log('[Toolbar] 特效音插入 - 最终插入位置:', {
        insertPosition,
        textLength: text.length,
        textBeforeInsert: text.substring(Math.max(0, insertPosition - 30), insertPosition),
        textAfterInsert: text.substring(insertPosition, Math.min(insertPosition + 30, text.length)),
        tag,
        lastOpenTag,
        lastCloseTag,
        isInTag: lastOpenTag > lastCloseTag
      });

      // 使用文本切片方式插入，确保位置准确
      const newText = text.slice(0, insertPosition) + tag + text.slice(insertPosition);

      console.log('[Toolbar] 特效音插入 - 文本切片插入:', {
        insertPosition,
        originalTextLength: text.length,
        newTextLength: newText.length,
        tagLength: tag.length,
        tagPosition: newText.indexOf(tag),
        tagPositionExpected: insertPosition,
        positionMatch: newText.indexOf(tag) === insertPosition,
        textBeforeTag: newText.substring(Math.max(0, insertPosition - 20), insertPosition),
        textAfterTag: newText.substring(insertPosition + tag.length, Math.min(insertPosition + tag.length + 20, newText.length)),
        // 验证标签完整性
        tagBeforeInsert: textBeforeInsert.substring(Math.max(0, textBeforeInsert.length - 20)),
        tagAfterInsert: textAfterInsert.substring(0, Math.min(20, textAfterInsert.length))
      });

      const newCharCount = getTextCharCount(newText);
      if (newCharCount <= maxLength) {
        setText(newText);
        // 使用 requestAnimationFrame 确保 DOM 更新后再定位光标
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // 插入特效音后，需要将光标移动到标签后面
            // 由于特效音标签在 TreeWalker 中被过滤，我们需要通过 DOM 操作来定位
            const container = textarea.getContainer();
            if (container) {
              // 查找刚插入的特效音标记元素
              // 使用 data-effect-id 属性来匹配，确保找到正确的标记
              const effectId = tag.match(/effect="([^"]+)"/)?.[1];
              const soundMarkers = container.querySelectorAll('.sound-effect-marker');
              
              // 找到最后一个匹配的特效音标记（刚插入的）
              let targetMarker: Element | null = null;
              if (effectId && soundMarkers.length > 0) {
                // 从后往前查找，找到最后一个匹配的标记
                for (let i = soundMarkers.length - 1; i >= 0; i--) {
                  const marker = soundMarkers[i];
                  if (marker.getAttribute('data-effect-id') === effectId) {
                    targetMarker = marker;
                    break;
                  }
                }
              } else if (soundMarkers.length > 0) {
                // 如果没有 effectId，使用最后一个标记
                targetMarker = soundMarkers[soundMarkers.length - 1];
              }
              
              if (targetMarker) {
                const selection = window.getSelection();
                if (selection) {
                  const range = document.createRange();
                  // 将光标设置在标记后面
                  range.setStartAfter(targetMarker);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                  
                  // 确保编辑器保持焦点，这样下次获取光标位置时能获取到当前选区
                  container.focus();
                  
                  // 重要：立即清除并更新 TextEditor 中的缓存
                  // 使用双重 requestAnimationFrame 确保 DOM 完全更新后再更新缓存
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      // 先清除可能的旧缓存，然后获取新的光标位置
                      // 通过直接调用 getSelection 来更新缓存
                      const newSelection = textarea.getSelection();
                      const actualPosition = textarea.getCursorPosition();
                      console.log('[Toolbar] 特效音插入 - 插入完成 (DOM定位):', {
                        markerFound: true,
                        effectId,
                        actualPosition,
                        newSelection,
                        textAtPosition: newText.substring(Math.max(0, actualPosition - 20), Math.min(actualPosition + 20, newText.length)),
                        tagFoundAt: newText.indexOf(tag),
                        tagFoundAtExpected: insertPosition
                      });
                    });
                  });
                }
              } else {
                // 如果找不到标记元素，回退到使用位置计算
                // 特效音标签在 TreeWalker 中被过滤，所以可见索引不变
                // 但我们需要将光标移动到标签后面，所以需要计算标签后的位置
                // 由于特效音标签不占用可见文本位置，插入后位置应该还是 visibleCursorIndex
                // 但为了确保光标在标签后面，我们需要通过文本位置来定位
                const newPosition = visibleCursorIndex;
                textarea.setCursorPosition(newPosition);
                const actualPosition = textarea.getCursorPosition();
                console.log('[Toolbar] 特效音插入 - 插入完成 (位置计算):', {
                  expectedPosition: newPosition,
                  actualPosition,
                  positionDiff: Math.abs(actualPosition - newPosition),
                  textAtPosition: newText.substring(Math.max(0, newPosition - 20), newPosition + 20),
                  tagFoundAt: newText.indexOf(tag),
                  tagFoundAtExpected: insertPosition
                });
              }
            }
            textarea.focus();
          });
        });
      } else {
        console.error('[Toolbar] 特效音插入 - 文本长度超出限制:', {
          newCharCount,
          maxLength
        });
        showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
      }
    }

    setIsSoundEffectDropdownOpen(false);
  };

  // 多发音人功能
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [voiceDropdownPosition, setVoiceDropdownPosition] = useState({ x: 0, y: 0 });
  const voiceButtonRef = useRef<HTMLButtonElement>(null);

  const handleMultipleSpeakers = async () => {
    // 检查是否有选中文本
    if (!textEditorRef?.current) {
      showToast(t('toast.editorNotInitialized'), 'error');
      return;
    }

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // 如果没有选中文本，显示提示
      showToast(t('toast.selectTextForVoice'), 'warning');
      return;
    }

    // 如果有选中文本，显示发音人下拉框
    if (voiceButtonRef.current) {
      const rect = voiceButtonRef.current.getBoundingClientRect();
      setVoiceDropdownPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      });
      setIsVoiceDropdownOpen(true);
    }
  };

  const handleVoiceSelect = async (voice: VoiceInfo) => {
    if (!textEditorRef?.current) return;

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    // 使用 DOM Range API 精确地添加发音人标记
    const gender = voice.gender === 'male' || voice.gender === 'female' ? voice.gender : 'male';
    const result = applyMarkerWithDOM(
      container,
      selection,
      'voice',
      { voice_id: voice.id, voice_name: voice.name, voice_avatar: getVoiceAvatar(voice.id, voice.name, gender) },
      extractTextFromRendered
    );

    if (!result) {
      showToast('无法应用发音人标记，选中内容不一致', 'error');
      return;
    }

    const { newText, newPosition } = result;
    const newCharCount = getTextCharCount(newText);

    if (newCharCount <= maxLength) {
      setText(newText);
      setTimeout(() => {
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      showToast(`文本长度超出限制（${newCharCount} / ${maxLength}）`, 'warning');
    }
  };

  const handleToggleActive = (id: string) => {
    setActiveButtons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 导入功能
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  // 清除功能
  const handleClearButtonClick = () => {
    if (clearButtonRef.current) {
      const rect = clearButtonRef.current.getBoundingClientRect();
      setClearDropdownPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      });
      setIsClearDropdownOpen(true);
    }
  };

  const handleClearAll = () => {
    clearText();
    showToast(t('toast.cleared'), 'info');

    // 延迟聚焦到编辑器
    setTimeout(() => {
      if (textEditorRef?.current) {
        const editor = textEditorRef.current.getContainer();
        if (editor) {
          editor.contentEditable = 'true';
          editor.focus();

          const selection = window.getSelection();
          const range = document.createRange();

          if (editor.firstChild) {
            range.setStart(editor.firstChild, 0);
            range.collapse(true);
          } else {
            range.selectNodeContents(editor);
            range.collapse(true);
          }

          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
    }, 100);
  };

  const handleClearFormatOnly = () => {
    // 提取纯文本（移除所有标记）
    const plainText = text
      .replace(/<[^>]+>/g, '') // 移除所有标签
      .trim();

    if (plainText.length === 0) {
      showToast(t('toast.noContentToKeep'), 'warning');
      return;
    }

    setText(plainText);
    showToast(t('toast.formatCleared'), 'info');

    // 延迟聚焦到编辑器
    setTimeout(() => {
      textEditorRef?.current?.focus();
    }, 100);
  };

  const handleFeatureClick = (id: string) => {
    // 切换激活状态
    handleToggleActive(id);

    // 根据功能执行相应操作
    switch (id) {

      case 'speedChange':
        handleSpeedButtonClick();
        break;
      case 'reread':
        handleReread();
        break;
      case 'numericReading':
        handleNumberReadingButtonClick();
        break;
      case 'multipleSpeakers':
        handleMultipleSpeakers();
        break;
      case 'polyphonic':
        handlePolyphonic();
        break;
      case 'specialEffects':
        handleSoundEffectClick();
        break;
      case 'backgroundMusic':
        if (bgmButtonRef.current) {
          const rect = bgmButtonRef.current.getBoundingClientRect();
          setBgmDropdownPosition({
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
          setIsBgmDropdownOpen(true);
        }
        break;
      case 'import':
        handleImport();
        break;
      case 'historyBackup':
        toggleHistoryPanel();
        break;
    }
  };

  const getDropdownPosition = () => {
    if (!pauseButtonRef.current) return { x: 0, y: 0 };
    const rect = pauseButtonRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom + 4,
    };
  };

  const getSpeedDropdownPosition = () => {
    if (!speedButtonRef.current) return { x: 0, y: 0 };
    const rect = speedButtonRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.bottom + 4,
    };
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const buttons: ToolbarButton[] = [

    {
      id: 'undo',
      label: t('toolbar.undo'),
      icon: Undo2,
      onClick: handleUndo,
      disabled: !canUndo,
      showSeparator: true,
    },
    {
      id: 'redo',
      label: t('toolbar.redo'),
      icon: Redo2,
      onClick: handleRedo,
      disabled: !canRedo,
    },
    {
      id: 'clear',
      label: t('toolbar.clear'),
      icon: Trash2,
      onClick: handleClearButtonClick,
    },
    {
      id: 'copy',
      label: t('toolbar.copy'),
      icon: Copy,
      onClick: handleCopy,
      disabled: getTextCharCount(text) === 0,
      showSeparator: true,
    },
    {
      id: 'insertPause',
      label: t('toolbar.insertPause'),
      icon: Pause,
      onClick: handlePauseButtonClick,
    },
    {
      id: 'speedChange',
      label: t('toolbar.speedChange'),
      icon: Sliders,
      onClick: handleSpeedButtonClick,
      isActive: activeButtons.has('speedChange'),
      showSeparator: true,
    },
    {
      id: 'reread',
      label: t('toolbar.reread'),
      icon: Repeat,
      onClick: () => handleFeatureClick('reread'),
    },
    {
      id: 'numericReading',
      label: t('toolbar.numericReading'),
      icon: Hash,
      onClick: handleNumberReadingButtonClick,
    },
    {
      id: 'multipleSpeakers',
      label: t('toolbar.multipleSpeakers'),
      icon: Users,
      onClick: () => handleFeatureClick('multipleSpeakers'),
    },
    {
      id: 'polyphonic',
      label: t('toolbar.polyphonic'),
      icon: Type,
      onClick: () => handleFeatureClick('polyphonic'),
    },
    {
      id: 'specialEffects',
      showSeparator: true,
      label: t('toolbar.specialEffects'),
      icon: Music,
      onClick: handleSoundEffectClick,
      isActive: activeButtons.has('specialEffects'),
    },
    {
      id: 'backgroundMusic',
      label: t('toolbar.backgroundMusic'),
      icon: Music2,
      onClick: () => handleFeatureClick('backgroundMusic'),
    },
    {
      id: 'import',
      label: t('toolbar.import'),
      icon: Upload,
      onClick: () => handleFeatureClick('import'),
      showSeparator: true,
    },
    {
      id: 'historyBackup',
      label: t('toolbar.historyBackup'),
      icon: Clock,
      onClick: () => handleFeatureClick('historyBackup'),
    },
  ];

  const openAppSettings = () => {
    window.dispatchEvent(new Event('lingjing:open-settings'));
  };

  return (
    <div className="mx-5 mt-10 mb-4 w-auto rounded-2xl border border-slate-200 bg-[#f8fafc]/95 px-4 py-3 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-center gap-1 min-w-max">
        {buttons.map((button, index) => {
          const Icon = button.icon;
          const isActive = button.isActive || false;
          const isDisabled = button.disabled || false;

          return (
            <div key={button.id} className="flex items-center">
              {button.showSeparator && index > 0 && (
                <div className="h-8 w-px bg-gray-300 mx-1" />
              )}
              <div className="relative">
                <button
                  ref={button.id === 'insertPause' ? pauseButtonRef : button.id === 'speedChange' ? speedButtonRef : button.id === 'numericReading' ? numberReadingButtonRef : button.id === 'polyphonic' ? polyphoneButtonRef : button.id === 'specialEffects' ? soundEffectButtonRef : button.id === 'backgroundMusic' ? bgmButtonRef : button.id === 'multipleSpeakers' ? voiceButtonRef : button.id === 'clear' ? clearButtonRef : undefined}
                  onMouseDown={(e) => e.preventDefault()} // 防止点击按钮导致编辑器失去焦点
                  onClick={button.onClick}
                  disabled={isDisabled}
                  className={`
                    flex flex-col items-center justify-center gap-1
                    px-3 py-2 min-w-[60px]
                    rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'bg-blue-500 text-white shadow-md'
                      : isDisabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }
                  `}
                  title={button.label}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  <span className="text-xs font-medium leading-tight">{button.label}</span>
                </button>

                {button.id === 'insertPause' && isPauseDropdownOpen && (
                  <PauseDropdown
                    isOpen={isPauseDropdownOpen}
                    onClose={() => setIsPauseDropdownOpen(false)}
                    onSelect={handleInsertPause}
                    position={getDropdownPosition()}
                  />
                )}
                {button.id === 'speedChange' && isSpeedDropdownOpen && (
                  <SpeedDropdown
                    isOpen={isSpeedDropdownOpen}
                    onClose={() => setIsSpeedDropdownOpen(false)}
                    onSelect={handleSpeedSelect}
                    position={getSpeedDropdownPosition()}
                    currentSpeed={audioConfig.speed}
                    editor={tiptapEditor}
                    textEditorRef={textEditorRef}
                  />
                )}
                {button.id === 'numericReading' && isNumberReadingDropdownOpen && (
                  <NumberReadingDropdown
                    isOpen={isNumberReadingDropdownOpen}
                    onClose={() => setIsNumberReadingDropdownOpen(false)}
                    onSelect={handleNumberReadingSelect}
                    position={getNumberReadingDropdownPosition()}
                  />
                )}
              </div>
            </div>
          );
        })}
        <div className="h-8 w-px bg-gray-300 mx-1 flex-shrink-0" aria-hidden />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openAppSettings}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900 flex-shrink-0"
          title={t('header.settings')}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs font-medium leading-tight">{t('header.settings')}</span>
        </button>
      </div>

      {/* 多发音人编辑器 */}
      {isVoiceDropdownOpen && (
        <VoiceDropdown
          isOpen={isVoiceDropdownOpen}
          onClose={() => setIsVoiceDropdownOpen(false)}
          position={voiceDropdownPosition}
          onSelect={handleVoiceSelect}
        />
      )}

      {/* 多音字下拉菜单 */}
      {isPolyphoneDropdownOpen && (
        <PolyphoneDropdown
          isOpen={isPolyphoneDropdownOpen}
          onClose={() => setIsPolyphoneDropdownOpen(false)}
          onSelect={handlePolyphoneSelect}
          position={polyphoneDropdownPosition}
          options={currentPolyphoneOptions}
          originalChar={currentPolyphoneChar}
        />
      )}

      {/* 特效音下拉菜单 */}
      {isSoundEffectDropdownOpen && (
        <SoundEffectDropdown
          isOpen={isSoundEffectDropdownOpen}
          onClose={() => setIsSoundEffectDropdownOpen(false)}
          onSelect={handleSoundEffectSelect}
          position={soundEffectDropdownPosition}
        />
      )}

      {/* 背景音乐下拉菜单 */}
      {isBgmDropdownOpen && (
        <BackgroundMusicDropdown
          isOpen={isBgmDropdownOpen}
          onClose={() => setIsBgmDropdownOpen(false)}
          position={bgmDropdownPosition}
        />
      )}

      {/* 导入对话框 */}
      {isImportDialogOpen && (
        <ImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />
      )}

      {/* 清除下拉菜单 */}
      {isClearDropdownOpen && (
        <ClearDropdown
          isOpen={isClearDropdownOpen}
          onClose={() => setIsClearDropdownOpen(false)}
          onClearAll={handleClearAll}
          onClearFormatOnly={handleClearFormatOnly}
          position={clearDropdownPosition}
        />
      )}
    </div>
  );
}
