import { useEffect, useRef } from 'react';

interface PauseDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ms: number) => void;
  position: { x: number; y: number };
  selectedMs?: number | null; // 当前选中的停顿时间（毫秒）
}

// 停顿时间选项（秒）- 最大2秒
const pauseOptions = [
  { label: '0.1s', value: 100 },
  { label: '0.2s', value: 200 },
  { label: '0.3s', value: 300 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
];

export function PauseDropdown({ isOpen, onClose, onSelect, position, selectedMs }: PauseDropdownProps) {
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
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 w-[70px] animate-in fade-in zoom-in duration-200"
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
        {pauseOptions.map((option) => {
          const isSelected = selectedMs !== null && selectedMs !== undefined && option.value === selectedMs;
          return (
            <button
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={`w-full px-2 py-2 text-center text-sm transition-colors duration-150 ${
                isSelected
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-sky-50 hover:text-sky-600'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
