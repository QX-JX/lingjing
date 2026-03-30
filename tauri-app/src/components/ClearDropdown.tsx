import { useEffect, useRef } from 'react';
import { Trash2, Eraser } from 'lucide-react';
import { t } from '../locales';

interface ClearDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => void;
  onClearFormatOnly: () => void;
  position: { x: number; y: number };
}

export function ClearDropdown({ isOpen, onClose, onClearAll, onClearFormatOnly, position }: ClearDropdownProps) {
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

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 min-w-[140px] animate-in fade-in zoom-in duration-200"
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
        {/* 清除所有内容 */}
        <button
          onClick={() => {
            onClearAll();
            onClose();
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 flex items-center gap-2 group"
        >
          <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-600" />
          <span>{t('clear.clearAll')}</span>
        </button>

        {/* 分隔线 */}
        <div className="h-px bg-gray-100 my-0.5" />

        {/* 仅清除格式 */}
        <button
          onClick={() => {
            onClearFormatOnly();
            onClose();
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150 flex items-center gap-2 group"
        >
          <Eraser className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
          <span>{t('clear.clearFormatOnly')}</span>
        </button>
      </div>
    </div>
  );
}
