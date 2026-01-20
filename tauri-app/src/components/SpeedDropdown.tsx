import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { TextEditorRef } from './TextEditor';

interface SpeedDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (speed: number) => void;
  position: { x: number; y: number };
  currentSpeed?: number;
  editor?: Editor | null;
  textEditorRef?: React.RefObject<TextEditorRef> | null;
}

// 变速倍率选项（用于标记选中文本的播放速度）
const speedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '0.8x', value: 0.8 },
  { label: '1.0x', value: 1.0 },
  { label: '1.2x', value: 1.2 },
  { label: '1.5x', value: 1.5 },
  { label: '2.0x', value: 2.0 },
];

export function SpeedDropdown({
  isOpen,
  onClose,
  onSelect,
  position,
  currentSpeed = 1.0,
  editor,
  textEditorRef
}: SpeedDropdownProps) {
  // 获取当前选中文本的速度倍率（如果有 SpeedMark）
  const getCurrentSpeedRate = (): number => {
    if (editor && editor.isActive('speedMark')) {
      const attrs = editor.getAttributes('speedMark');
      return attrs.rate || 1.0;
    }
    return currentSpeed;
  };

  const handleSpeedSelect = (speed: number) => {
    console.log('[SpeedDropdown] handleSpeedSelect 被调用', { speed, hasEditor: !!editor, hasTextEditorRef: !!textEditorRef?.current });

    // 如果提供了 TipTap 编辑器实例，并且有选中文本，则应用 SpeedMark
    if (editor) {
      const { from, to } = editor.state.selection;
      console.log('[SpeedDropdown] TipTap 编辑器 - 选中范围:', { from, to, hasSelection: from !== to });
      if (from !== to) {
        // 有选中文本，应用 SpeedMark
        console.log('[SpeedDropdown] 应用 TipTap SpeedMark, rate:', speed);
        editor.chain().focus().setSpeedMark({ rate: speed }).run();
        onClose();
        return;
      } else {
        // 没有选中文本，提示用户
        console.warn('[SpeedDropdown] TipTap 编辑器 - 没有选中文本');
        alert('请先选中要变速的文本');
        onClose();
        return;
      }
    }

    // 如果提供了 textEditorRef（contentEditable 编辑器）
    if (textEditorRef?.current) {
      console.log('[SpeedDropdown] 使用 textEditorRef');
      const selection = textEditorRef.current.getSelection();
      console.log('[SpeedDropdown] 选中信息:', {
        start: selection.start,
        end: selection.end,
        text: selection.text,
        hasSelection: selection.start !== selection.end
      });

      if (selection.start !== selection.end) {
        // 有选中文本，通过 onSelect 回调处理（Toolbar 中会处理具体逻辑）
        console.log('[SpeedDropdown] 有选中文本，调用 onSelect 回调, speed:', speed);
        onSelect(speed);
        onClose();
        return;
      } else {
        // 没有选中文本，提示用户
        console.warn('[SpeedDropdown] 没有选中文本');
        alert('请先选中要变速的文本');
        onClose();
        return;
      }
    }

    // 如果没有编辑器实例，调用原有的 onSelect 回调（用于全局速度设置）
    console.log('[SpeedDropdown] 没有编辑器实例，调用 onSelect（全局速度设置）');
    onSelect(speed);
    onClose();
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 min-w-[100px] animate-in fade-in zoom-in duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* 三角形箭头 */}
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"
      />

      <div className="relative bg-white rounded-lg overflow-hidden">
        {speedOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSpeedSelect(option.value)}
            className="w-full px-4 py-2 text-center text-sm transition-colors duration-150 text-gray-700 hover:bg-gray-100"
          >
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
