import { useEffect, useRef } from 'react';

interface PauseDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ms: number) => void;
  position: { x: number; y: number };
}

// 停顿时间选项（秒）
const pauseOptions = [
  { label: '0.1s', value: 100 },
  { label: '0.2s', value: 200 },
  { label: '0.3s', value: 300 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];

export function PauseDropdown({ isOpen, onClose, onSelect, position }: PauseDropdownProps) {
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
        {pauseOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onSelect(option.value);
              onClose();
            }}
            className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-600 transition-colors duration-150"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
