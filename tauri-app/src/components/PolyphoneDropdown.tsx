import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PolyphoneDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (pinyin: string) => void;
    position: { x: number; y: number };
    options: string[];
    originalChar: string;
}

export function PolyphoneDropdown({
    isOpen,
    onClose,
    onSelect,
    position,
    options,
    originalChar
}: PolyphoneDropdownProps) {
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

    return createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-100 py-1.5 min-w-[120px] animate-in fade-in zoom-in duration-200"
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

            <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 text-center font-medium">
                "{originalChar}" 的读音
            </div>

            <div className="relative bg-white rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                {options.map((pinyin) => (
                    <button
                        key={pinyin}
                        onClick={() => {
                            onSelect(pinyin);
                            onClose();
                        }}
                        className="w-full px-4 py-2 text-center text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                    >
                        {getToneMark(pinyin)}
                    </button>
                ))}
            </div>
        </div>,
        document.body
    );
}

const toneMap: Record<string, string> = {
    'a': 'āáǎàa',
    'o': 'ōóǒòo',
    'e': 'ēéěèe',
    'i': 'īíǐìi',
    'u': 'ūúǔùu',
    'v': 'ǖǘǚǜü'
};

function getToneMark(pinyinStr: string): string {
    const tone = pinyinStr.match(/\d$/);
    if (!tone) return pinyinStr;
    const toneNum = parseInt(tone[0], 10);
    const basePinyin = pinyinStr.replace(/\d$/, '');

    if (toneNum === 5 || toneNum === 0) return basePinyin; // 轻声

    // 优先级: a > o > e > i, u (后出现的)
    let charToChange = '';
    let indexToChange = -1;

    if (basePinyin.includes('a')) {
        charToChange = 'a';
        indexToChange = basePinyin.indexOf('a');
    } else if (basePinyin.includes('o')) {
        charToChange = 'o';
        indexToChange = basePinyin.indexOf('o');
    } else if (basePinyin.includes('e')) {
        charToChange = 'e';
        indexToChange = basePinyin.indexOf('e');
    } else if (basePinyin.includes('iu')) {
        charToChange = 'u';
        indexToChange = basePinyin.indexOf('u');
    } else if (basePinyin.includes('ui')) {
        charToChange = 'i';
        indexToChange = basePinyin.indexOf('i');
    } else {
        for (let i = basePinyin.length - 1; i >= 0; i--) {
            if (['i', 'u', 'v', 'ü'].includes(basePinyin[i])) {
                charToChange = basePinyin[i] === 'ü' ? 'v' : basePinyin[i];
                indexToChange = i;
                break;
            }
        }
    }

    if (indexToChange === -1) return basePinyin;

    const replacements = toneMap[charToChange];
    if (!replacements) return basePinyin;

    const replacement = replacements[toneNum - 1];
    return basePinyin.substring(0, indexToChange) + replacement + basePinyin.substring(indexToChange + 1);
}
