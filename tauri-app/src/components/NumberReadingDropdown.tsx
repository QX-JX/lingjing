import { useEffect, useRef } from 'react';

interface NumberReadingDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (mode: string) => void;
    position: { x: number; y: number };
}

// 数字读法选项
const numberReadingOptions = [
    { label: '读数字', value: 'digits', description: '如：123 读作 "一二三"' },
    { label: '读数值', value: 'cardinal', description: '如：123 读作 "一百二十三"' },
    { label: '读号码', value: 'telephone', description: '如：123 读作 "幺二三"' },
];

export function NumberReadingDropdown({ isOpen, onClose, onSelect, position }: NumberReadingDropdownProps) {
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
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 min-w-[110px] animate-in fade-in zoom-in duration-200"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)', // 水平居中
            }}
        >
            {/* 三角形箭头 */}
            <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45"
            />

            <div className="relative bg-white rounded-lg overflow-hidden">
                {numberReadingOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => {
                            onSelect(option.value);
                            onClose();
                        }}
                        className="w-full px-4 py-2 text-center text-[13px] text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors duration-150"
                        title={option.description}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
