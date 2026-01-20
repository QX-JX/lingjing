import { useState, useRef } from 'react';
import {
  FileCheck,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  Pause,
  Repeat,
  Hash,
  Users,
  Type,
  ArrowLeftRight,
  Music,
  Music2,
  PauseCircle,
  Upload,
  Clock,
  Sliders,
  Volume2,
} from 'lucide-react';
import { useTextEditor } from '../contexts/TextEditorContext';
import { useDialog } from '../contexts/DialogContext';
import { useAppStore } from '../store/useAppStore';
import { PauseDropdown } from './PauseDropdown';
import { SpeedDropdown } from './SpeedDropdown';
import { NumberReadingDropdown } from './NumberReadingDropdown';
import { MultiVoiceEditor } from './MultiVoiceEditor';
import { copyToClipboard, checkText, getTextCharCount } from '../utils/textProcessor';
import {
  insertRepeat,
  insertNumber,
  insertPolyphone,
  wrapTextWithSpeed
} from '../utils/textMarkers';
import { extractTextFromRendered } from '../utils/textRenderer';

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
  const dialog = useDialog();
  const { text, setText, undo, redo, clearText, history, historyIndex, maxLength, audioConfig, setAudioConfig } = useAppStore();
  const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
  const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
  const [isNumberReadingDropdownOpen, setIsNumberReadingDropdownOpen] = useState(false);
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set(['textCheck', 'speedChange', 'specialEffects']));
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const numberReadingButtonRef = useRef<HTMLButtonElement>(null);

  const handleInsertPause = (ms: number) => {
    if (!textEditorRef?.current) return;

    const textarea = textEditorRef.current;
    const selection = textarea.getSelection();

    // 如果有选中文本，在选中文本后插入停顿
    if (selection.start !== selection.end) {
      const tag = `<pause ms="${ms}"/>`;
      const newText =
        text.slice(0, selection.end) +
        tag +
        text.slice(selection.end);

      const newCharCount = getTextCharCount(newText);
      if (newCharCount <= maxLength) {
        setText(newText);
        setTimeout(() => {
          const newPosition = selection.end + tag.length;
          textarea.setCursorPosition(newPosition);
          textarea.focus();
        }, 0);
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

    // 如果有 textEditorRef，先检查是否有选中文本
    if (textEditorRef?.current) {
      const selection = textEditorRef.current.getSelection();
      console.log('[Toolbar] 当前选中状态:', {
        start: selection.start,
        end: selection.end,
        text: selection.text,
        hasSelection: selection.start !== selection.end
      });
    }

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

      // 在原始文本中查找选中文本的位置
      // 需要将纯文本位置转换为原始文本位置（考虑标记长度）
      const plainText = currentText.replace(/<[^>]+>/g, '');
      const foundIndex = plainText.indexOf(selectedPlainText);

      if (foundIndex === -1) {
        console.error('[Toolbar] 无法在文本中找到选中内容');
        alert('无法应用变速标记，请选择连续的文本');
        return;
      }

      console.log('[Toolbar] 纯文本匹配:', {
        plainTextLength: plainText.length,
        foundIndex,
        selectedPlainText,
        plainTextPreview: plainText.substring(Math.max(0, foundIndex - 5), foundIndex + selectedPlainText.length + 5)
      });

      // 将纯文本位置转换为原始文本位置
      // 正确的方法：遍历原始文本，同步计算纯文本位置，但需要跳过所有标记
      let plainTextPos = 0;
      let originalStartPos = 0;
      let inTag = false;

      // 找到开始位置：遍历到纯文本位置 foundIndex 时，记录原始文本位置
      for (let i = 0; i < currentText.length; i++) {
        if (plainTextPos >= foundIndex) {
          break;
        }

        if (currentText[i] === '<') {
          inTag = true;
          // 跳过整个标签
          const tagEnd = currentText.indexOf('>', i);
          if (tagEnd !== -1) {
            i = tagEnd;
            inTag = false;
            continue;
          }
        }

        if (!inTag && currentText[i] !== '>') {
          // 只有在标签外才增加纯文本位置
          plainTextPos++;
          originalStartPos++;
        } else if (currentText[i] === '>') {
          inTag = false;
        }
      }

      // 找到结束位置：继续从 originalStartPos 开始，直到纯文本位置达到 foundIndex + selectedPlainText.length
      let plainTextPos2 = foundIndex;
      let originalEndPos = originalStartPos;
      const targetEndPlainPos = foundIndex + selectedPlainText.length;
      inTag = false;

      for (let i = originalStartPos; i < currentText.length; i++) {
        if (plainTextPos2 >= targetEndPlainPos) {
          break;
        }

        if (currentText[i] === '<') {
          inTag = true;
          // 跳过整个标签
          const tagEnd = currentText.indexOf('>', i);
          if (tagEnd !== -1) {
            i = tagEnd;
            inTag = false;
            originalEndPos = i + 1;
            continue;
          }
        }

        if (!inTag && currentText[i] !== '>') {
          // 只有在标签外才增加纯文本位置
          plainTextPos2++;
          originalEndPos++;
        } else if (currentText[i] === '>') {
          inTag = false;
          originalEndPos++;
        }
      }

      // 验证转换是否正确
      const actualSelectedText = currentText.substring(originalStartPos, originalEndPos);
      const actualPlainText = actualSelectedText.replace(/<[^>]+>/g, '');

      console.log('[Toolbar] 转换后的位置:', {
        plainTextStart: foundIndex,
        plainTextEnd: targetEndPlainPos,
        originalStartPos,
        originalEndPos,
        actualSelectedText: actualSelectedText.substring(0, 50),
        actualPlainText,
        expectedPlainText: selectedPlainText,
        match: actualPlainText === selectedPlainText
      });

      if (actualPlainText !== selectedPlainText) {
        console.error('[Toolbar] 位置转换不匹配，尝试修正');
        // 如果匹配不准确，尝试在原始文本中直接查找
        // 但要排除标记内的文本
        const searchText = selectedPlainText;
        let searchPlainPos = 0;
        let searchOriginalPos = 0;
        let matchStart = -1;
        let matchEnd = -1;
        inTag = false;

        for (let i = 0; i < currentText.length; i++) {
          if (currentText[i] === '<') {
            inTag = true;
            const tagEnd = currentText.indexOf('>', i);
            if (tagEnd !== -1) {
              i = tagEnd;
              inTag = false;
              continue;
            }
          }

          if (!inTag && currentText[i] !== '>') {
            if (searchPlainPos < searchText.length &&
              currentText[i] === searchText[searchPlainPos]) {
              if (matchStart === -1) {
                matchStart = i;
              }
              searchPlainPos++;
              if (searchPlainPos === searchText.length) {
                matchEnd = i + 1;
                break;
              }
            } else {
              searchPlainPos = 0;
              matchStart = -1;
            }
            searchOriginalPos++;
          } else if (currentText[i] === '>') {
            inTag = false;
          }
        }

        if (matchStart !== -1 && matchEnd !== -1) {
          originalStartPos = matchStart;
          originalEndPos = matchEnd;
          console.log('[Toolbar] 使用修正后的位置:', { originalStartPos, originalEndPos });
        } else {
          console.error('[Toolbar] 无法修正位置，放弃操作');
          alert('无法应用变速标记，位置计算错误');
          return;
        }
      }

      const originalStartPos_final = originalStartPos;
      const originalEndPos_final = originalEndPos;

      // 应用速度标记
      const { newText, newPosition } = wrapTextWithSpeed(
        currentText,
        originalStartPos_final,
        originalEndPos_final,
        speed
      );

      console.log('[Toolbar] wrapTextWithSpeed 结果:', {
        newTextPreview: newText.substring(0, 100) + '...',
        newPosition,
        textLength: newText.length
      });

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
        alert(`文本长度超出限制（${newCharCount} / ${maxLength}）`);
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

  const handleClear = () => {
    if (confirm('确定要清除所有文本吗？')) {
      clearText();
      textEditorRef?.current?.focus();
    }
  };

  const handleCopy = async () => {
    if (getTextCharCount(text) === 0) {
      alert('没有可复制的文本');
      return;
    }
    const success = await copyToClipboard(text);
    if (success) {
      alert('文本已复制到剪贴板');
    } else {
      alert('复制失败，请重试');
    }
  };

  const handleTextCheck = () => {
    const result = checkText(text, maxLength);
    if (result.isValid) {
      alert(`文本检测通过\n字符数: ${result.charCount}\n字数: ${result.wordCount}`);
    } else {
      alert(`文本检测发现问题:\n${result.issues.join('\n')}\n\n字符数: ${result.charCount}\n字数: ${result.wordCount}`);
    }
  };

  // 重读功能
  const handleReread = () => {
    if (!textEditorRef?.current) return;
    const textarea = textEditorRef.current;
    const position = textarea.getCursorPosition();
    const times = prompt('请输入重读次数（默认2次）:', '2');
    if (times === null) return;
    const repeatTimes = parseInt(times) || 2;
    const { newText, newPosition } = insertRepeat(text, position, repeatTimes);
    const newCharCount = getTextCharCount(newText);
    if (newCharCount <= maxLength) {
      setText(newText);
      setTimeout(() => {
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    }
  };

  // 数字读法按钮点击
  const handleNumberReadingButtonClick = () => {
    setIsNumberReadingDropdownOpen(true);
  };

  // 数字读法选择处理
  const handleNumberReadingSelect = async (mode: string) => {
    if (!textEditorRef?.current) {
      await dialog.showAlert('编辑器未初始化');
      return;
    }

    const textarea = textEditorRef.current;
    const selection = textarea.getSelection();

    // 检查是否有选中文本
    if (selection.start === selection.end) {
      await dialog.showAlert('请先选中要添加数字读法的数字');
      return;
    }

    const selectedText = selection.text;

    // 验证选中的文本是否为数字（允许小数点和负号）
    const isNumber = /^-?\d+(\.\d+)?$/.test(selectedText.trim());

    if (!isNumber) {
      await dialog.showAlert('只能选择数字！请选中纯数字后再使用此功能。');
      return;
    }

    // 在选中文本外包裹数字读法标记
    const beforeSelection = text.slice(0, selection.start);
    const afterSelection = text.slice(selection.end);
    const markedText = `<number mode="${mode}">${selectedText}</number>`;
    const newText = beforeSelection + markedText + afterSelection;

    const newCharCount = getTextCharCount(newText);
    if (newCharCount <= maxLength) {
      setText(newText);
      setTimeout(() => {
        const newPosition = selection.start + markedText.length;
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      await dialog.showAlert(`文本长度超出限制（${newCharCount} / ${maxLength}）`);
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
  const handlePolyphonic = () => {
    if (!textEditorRef?.current) return;
    const textarea = textEditorRef.current;
    const position = textarea.getCursorPosition();
    const pronunciation = prompt('请输入拼音发音（如：zhong）:', '');
    if (pronunciation === null || !pronunciation.trim()) return;
    const { newText, newPosition } = insertPolyphone(text, position, pronunciation);
    const newCharCount = getTextCharCount(newText);
    if (newCharCount <= maxLength) {
      setText(newText);
      setTimeout(() => {
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    }
  };

  // 多发音人功能
  const [isMultiVoiceEditorOpen, setIsMultiVoiceEditorOpen] = useState(false);

  const handleMultipleSpeakers = () => {
    setIsMultiVoiceEditorOpen(true);
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
  const handleImport = async () => {
    try {
      const { importTextFile, showOpenDialog } = await import('../services/ttsService');
      const { canceled, filePaths } = await showOpenDialog({
        title: '导入文本',
        filters: [{ name: '文本文件', extensions: ['txt'] }],
        properties: ['openFile']
      });

      if (!canceled && filePaths.length > 0) {
        const content = await importTextFile(filePaths[0]);
        if (content) {
          // 确认是否覆盖当前文本
          if (text.length > 0 && !confirm('是否覆盖当前文本？')) {
            setText(text + '\n' + content);
          } else {
            setText(content);
          }
        }
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请检查文件格式');
    }
  };

  const handleFeatureClick = (id: string) => {
    // 切换激活状态
    handleToggleActive(id);

    // 根据功能执行相应操作
    switch (id) {
      case 'textCheck':
        handleTextCheck();
        break;
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
      case 'replaceReading':
        alert('替换朗读功能：将在后续版本中实现');
        break;
      case 'specialEffects':
        alert('特效音功能：将在后续版本中实现');
        break;
      case 'backgroundMusic':
        alert('背景音乐功能：将在后续版本中实现');
        break;
      case 'pauseAdjust':
        alert('停顿调节功能：将在后续版本中实现');
        break;
      case 'import':
        handleImport();
        break;
      case 'historyBackup':
        alert('历史备份功能：将在后续版本中实现');
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
      id: 'textCheck',
      label: '文本检测',
      icon: FileCheck,
      onClick: () => handleFeatureClick('textCheck'),
      isActive: activeButtons.has('textCheck'),
    },
    {
      id: 'undo',
      label: '撤销',
      icon: Undo2,
      onClick: handleUndo,
      disabled: !canUndo,
      showSeparator: true,
    },
    {
      id: 'redo',
      label: '重做',
      icon: Redo2,
      onClick: handleRedo,
      disabled: !canRedo,
    },
    {
      id: 'clear',
      label: '清除',
      icon: Trash2,
      onClick: handleClear,
    },
    {
      id: 'copy',
      label: '复制',
      icon: Copy,
      onClick: handleCopy,
      disabled: getTextCharCount(text) === 0,
      showSeparator: true,
    },
    {
      id: 'insertPause',
      label: '插入停顿',
      icon: Pause,
      onClick: handlePauseButtonClick,
    },
    {
      id: 'speedChange',
      label: '变速',
      icon: Sliders,
      onClick: handleSpeedButtonClick,
      isActive: activeButtons.has('speedChange'),
      showSeparator: true,
    },
    {
      id: 'reread',
      label: '重读',
      icon: Repeat,
      onClick: () => handleFeatureClick('reread'),
    },
    {
      id: 'numericReading',
      label: '数字读法',
      icon: Hash,
      onClick: handleNumberReadingButtonClick,
    },
    {
      id: 'multipleSpeakers',
      label: '多发音人',
      icon: Users,
      onClick: () => handleFeatureClick('multipleSpeakers'),
    },
    {
      id: 'polyphonic',
      label: '多音字',
      icon: Type,
      onClick: () => handleFeatureClick('polyphonic'),
    },
    {
      id: 'replaceReading',
      label: '替换朗读',
      icon: ArrowLeftRight,
      onClick: () => handleFeatureClick('replaceReading'),
    },
    {
      id: 'specialEffects',
      showSeparator: true,
      label: '特效音',
      icon: Music,
      onClick: () => handleFeatureClick('specialEffects'),
      isActive: activeButtons.has('specialEffects'),
    },
    {
      id: 'backgroundMusic',
      label: '背景音乐',
      icon: Music2,
      onClick: () => handleFeatureClick('backgroundMusic'),
    },
    {
      id: 'pauseAdjust',
      label: '停顿调节',
      icon: PauseCircle,
      onClick: () => handleFeatureClick('pauseAdjust'),
    },
    {
      id: 'import',
      label: '导入',
      icon: Upload,
      onClick: () => handleFeatureClick('import'),
      showSeparator: true,
    },
    {
      id: 'historyBackup',
      label: '历史备份',
      icon: Clock,
      onClick: () => handleFeatureClick('historyBackup'),
    },
  ];

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
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
                  ref={button.id === 'insertPause' ? pauseButtonRef : button.id === 'speedChange' ? speedButtonRef : button.id === 'numericReading' ? numberReadingButtonRef : undefined}
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
      </div>

      {/* 多发音人编辑器 */}
      {isMultiVoiceEditorOpen && (
        <MultiVoiceEditor
          isOpen={isMultiVoiceEditorOpen}
          onClose={() => setIsMultiVoiceEditorOpen(false)}
          onApply={(segments) => {
            console.log('应用多发音人分段:', segments);
          }}
        />
      )}
    </div>
  );
}
