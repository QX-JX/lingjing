import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { renderTextWithMarkers, extractTextFromRendered } from '../utils/textRenderer';
import { PauseDropdown } from './PauseDropdown';
import { SpeedDropdown } from './SpeedDropdown';
import { NumberReadingDropdown } from './NumberReadingDropdown';
import { PolyphoneDropdown } from './PolyphoneDropdown';
import { pinyin } from 'pinyin-pro';
import { getTextCharCount } from '../utils/textProcessor';

export interface SegmentEditorRef {
    getContainer: () => HTMLDivElement | null;
    getSelection: () => { start: number; end: number; text: string };
    setCursorPosition: (position: number) => void;
    focus: () => void;
    insertSSMLTag: (tag: string) => void;
    getCursorPosition: () => number;
}

interface SegmentEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    onFocus?: () => void;
    onBlur?: () => void;
}

// 光标位置管理函数 (从 TextEditor 复制)
function saveCursorPosition(container: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;

    const range = selection.getRangeAt(0);
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

    if (!container.firstChild) {
        range.setStart(container, 0);
        range.setEnd(container, 0);
        selection.removeAllRanges();
        selection.addRange(range);
        container.focus();
        return;
    }

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

export const SegmentEditor = forwardRef<SegmentEditorRef, SegmentEditorProps>(
    ({ value, onChange, placeholder = '输入文本内容...', maxLength = 5000, onFocus, onBlur }, ref) => {
        const editorRef = useRef<HTMLDivElement>(null);
        const isUpdatingRef = useRef(false);
        const { locale } = useAppStore();
        const [isPauseDropdownOpen, setIsPauseDropdownOpen] = useState(false);
        const [pauseDropdownPosition, setPauseDropdownPosition] = useState({ x: 0, y: 0 });
        const [currentPauseElement, setCurrentPauseElement] = useState<HTMLElement | null>(null);
        const [isSpeedDropdownOpen, setIsSpeedDropdownOpen] = useState(false);
        const [speedDropdownPosition, setSpeedDropdownPosition] = useState({ x: 0, y: 0 });
        const [currentSpeedElement, setCurrentSpeedElement] = useState<HTMLElement | null>(null);
        const [isNumberReadingDropdownOpen, setIsNumberReadingDropdownOpen] = useState(false);
        const [numberReadingDropdownPosition, setNumberReadingDropdownPosition] = useState({ x: 0, y: 0 });
        const [currentNumberElement, setCurrentNumberElement] = useState<HTMLElement | null>(null);
        const [isPolyphoneDropdownOpen, setIsPolyphoneDropdownOpen] = useState(false);
        const [polyphoneDropdownPosition, setPolyphoneDropdownPosition] = useState({ x: 0, y: 0 });
        const [currentPolyphoneElement, setCurrentPolyphoneElement] = useState<HTMLElement | null>(null);
        const [currentPolyphoneOptions, setCurrentPolyphoneOptions] = useState<string[]>([]);
        const [currentPolyphoneChar, setCurrentPolyphoneChar] = useState<string>('');

        const renderedHtml = renderTextWithMarkers(value, locale);

        // 从 contentEditable 提取文本并更新状态
        const updateTextFromEditor = () => {
            if (!editorRef.current || isUpdatingRef.current) return;

            const html = editorRef.current.innerHTML;
            const extractedText = extractTextFromRendered(html);

            const charCount = getTextCharCount(extractedText);
            if (extractedText !== value && charCount <= maxLength) {
                onChange(extractedText);
            }
        };

        // 处理输入事件
        const handleInput = () => {
            updateTextFromEditor();
        };

        const insertPlainText = (rawText: string) => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            range.deleteContents();

            const textNode = document.createTextNode(rawText);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);

            updateTextFromEditor();
        };

        // 处理粘贴事件
        const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData('text/plain');
            if (!pastedText) return;
            insertPlainText(pastedText);
        };

        // 处理点击事件 - 标记交互逻辑
        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;

            // 停顿关闭按钮
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
                        const newValue = value.replace(pauseRegex, (_match) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return ''; // 移除停顿标记
                            }
                            matchIndex++;
                            return _match;
                        });
                        onChange(newValue);
                    }
                }
                return;
            }

            // 停顿箭头点击
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

            // 变速关闭按钮
            const speedClose = target.closest('.speed-close');
            if (speedClose) {
                e.preventDefault();
                e.stopPropagation();

                const speedWrapper = speedClose.closest('.speed-marker-wrapper') as HTMLElement;
                if (speedWrapper && editorRef.current) {
                    const allSpeedWrappers = Array.from(
                        editorRef.current.querySelectorAll('.speed-marker-wrapper')
                    ) as HTMLElement[];
                    const wrapperIndex = allSpeedWrappers.indexOf(speedWrapper);

                    if (wrapperIndex !== -1) {
                        const speedRegex = /<speed\s+rate=["']([^"']+)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g;
                        let matchIndex = 0;
                        const newValue = value.replace(speedRegex, (match, _rate, content) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return content;
                            }
                            matchIndex++;
                            return match;
                        });

                        onChange(newValue);
                    }
                }
                return;
            }

            // 变速箭头点击
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

            // 数字关闭按钮
            const numberClose = target.closest('.number-close');
            if (numberClose) {
                e.preventDefault();
                e.stopPropagation();

                const numberWrapper = numberClose.closest('.number-marker-wrapper');
                if (numberWrapper && editorRef.current) {
                    const allNumberWrappers = Array.from(
                        editorRef.current.querySelectorAll('.number-marker-wrapper')
                    ) as HTMLElement[];
                    const wrapperIndex = allNumberWrappers.indexOf(numberWrapper as HTMLElement);

                    if (wrapperIndex !== -1) {
                        const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
                        let matchIndex = 0;
                        const newValue = value.replace(numberRegex, (_match, _mode, content) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return content;
                            }
                            matchIndex++;
                            return _match;
                        });

                        onChange(newValue);
                    }
                }
                return;
            }

            // 数字读法箭头点击
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

            // 多音字点击
            const polyphoneWrapper = target.closest('.polyphone-marker-wrapper');
            if (polyphoneWrapper) {
                e.preventDefault();
                e.stopPropagation();

                const contentEl = polyphoneWrapper.querySelector('.polyphone-content');
                const char = contentEl?.textContent || '';

                if (char) {
                    const pinyinResult = pinyin(char, {
                        pattern: 'pinyin',
                        toneType: 'num',
                        type: 'array',
                        multiple: true
                    });

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

            // 重读关闭按钮
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
                        const newValue = value.replace(regex, (_match, content) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return content;
                            }
                            matchIndex++;
                            return _match;
                        });
                        onChange(newValue);
                    }
                }
                return;
            }

            // 音效关闭按钮
            const soundClose = target.closest('.sound-close');
            if (soundClose) {
                e.preventDefault();
                e.stopPropagation();

                const soundWrapper = soundClose.closest('.sound-effect-marker');
                if (soundWrapper && editorRef.current) {
                    const allWrappers = Array.from(editorRef.current.querySelectorAll('.sound-effect-marker'));
                    const wrapperIndex = allWrappers.indexOf(soundWrapper);

                    if (wrapperIndex !== -1) {
                        const regex = /<sound\s+effect=["']([^"']+)["']\s*\/>/g;
                        let matchIndex = 0;
                        const newValue = value.replace(regex, (_match) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return '';
                            }
                            matchIndex++;
                            return _match;
                        });
                        onChange(newValue);
                    }
                }
                return;
            }

            // 发音人关闭按钮
            const voiceClose = target.closest('.voice-close');
            if (voiceClose) {
                e.preventDefault();
                e.stopPropagation();

                const voiceWrapper = voiceClose.closest('.voice-marker-wrapper');
                if (voiceWrapper && editorRef.current) {
                    const allWrappers = Array.from(editorRef.current.querySelectorAll('.voice-marker-wrapper'));
                    const wrapperIndex = allWrappers.indexOf(voiceWrapper);

                    if (wrapperIndex !== -1) {
                        const regex = /<voice\s+voice_id=["']([^"']+)["']\s+voice_name=["']([^"']+)["']\s+voice_avatar=["']([^"']*)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/voice>/g;
                        let matchIndex = 0;
                        const newValue = value.replace(regex, (_match, _id, _name, _avatar, content) => {
                            if (matchIndex === wrapperIndex) {
                                matchIndex++;
                                return content; // 保留内容，移除voice标签
                            }
                            matchIndex++;
                            return _match;
                        });
                        onChange(newValue);
                    }
                }
                return;
            }
        };

        // 处理停顿修改
        const handlePauseSelect = (ms: number) => {
            if (!currentPauseElement || !editorRef.current) return;

            const oldMs = currentPauseElement.getAttribute('data-pause-ms');
            if (!oldMs) return;

            const allPauseElements = Array.from(
                editorRef.current.querySelectorAll('.pause-marker-wrapper')
            ) as HTMLElement[];
            const currentIndex = allPauseElements.indexOf(currentPauseElement);

            if (currentIndex === -1) return;

            const pauseRegex = /<pause\s+ms=["'](\d+)["']\s*\/>/g;

            let matchIndex = 0;
            const newValue = value.replace(pauseRegex, (match, _matchMs) => {
                if (matchIndex === currentIndex) {
                    matchIndex++;
                    return `<pause ms="${ms}"/>`;
                }
                matchIndex++;
                return match;
            });

            onChange(newValue);
            setIsPauseDropdownOpen(false);
            setCurrentPauseElement(null);
        };

        // 处理变速修改
        const handleSpeedSelect = (speed: number) => {
            if (!currentSpeedElement || !editorRef.current) return;

            const allSpeedWrappers = Array.from(
                editorRef.current.querySelectorAll('.speed-marker-wrapper')
            ) as HTMLElement[];
            const wrapperIndex = allSpeedWrappers.indexOf(currentSpeedElement);

            if (wrapperIndex === -1) return;

            const speedRegex = /<speed\s+rate=["']([^"']+)["']>([^<]*(?:<[^/][^>]*>.*?<\/[^/][^>]*>[^<]*)*)<\/speed>/g;
            let matchIndex = 0;
            const newValue = value.replace(speedRegex, (match, _rate, content) => {
                if (matchIndex === wrapperIndex) {
                    matchIndex++;
                    return `<speed rate="${speed}">${content}</speed>`;
                }
                matchIndex++;
                return match;
            });

            onChange(newValue);
            setIsSpeedDropdownOpen(false);
            setCurrentSpeedElement(null);
        };

        // 处理数字读法修改
        const handleNumberReadingSelect = (mode: string) => {
            if (!currentNumberElement || !editorRef.current) return;

            const allNumberWrappers = Array.from(
                editorRef.current.querySelectorAll('.number-marker-wrapper')
            ) as HTMLElement[];
            const wrapperIndex = allNumberWrappers.indexOf(currentNumberElement);

            if (wrapperIndex === -1) return;

            const numberRegex = /<number\s+mode=["']([^"']+)["']>([^<]*)<\/number>/g;
            let matchIndex = 0;
            const newValue = value.replace(numberRegex, (_match, _oldMode, content) => {
                if (matchIndex === wrapperIndex) {
                    matchIndex++;
                    return `<number mode="${mode}">${content}</number>`;
                }
                matchIndex++;
                return _match;
            });

            onChange(newValue);
            setIsNumberReadingDropdownOpen(false);
            setCurrentNumberElement(null);
        };

        // 处理多音字选择
        const handlePolyphoneSelect = (pinyin: string) => {
            if (!currentPolyphoneElement || !editorRef.current) return;

            const allWrappers = Array.from(editorRef.current.querySelectorAll('.polyphone-marker-wrapper'));
            const wrapperIndex = allWrappers.indexOf(currentPolyphoneElement);

            if (wrapperIndex === -1) return;

            const regex = /<polyphone\s+pronunciation=["']([^"']+)["']>([^<]*)<\/polyphone>/g;
            let matchIndex = 0;
            const newValue = value.replace(regex, (_match, _oldPinyin, content) => {
                if (matchIndex === wrapperIndex) {
                    matchIndex++;
                    return `<polyphone pronunciation="${pinyin}">${content}</polyphone>`;
                }
                matchIndex++;
                return _match;
            });

            onChange(newValue);
            setIsPolyphoneDropdownOpen(false);
            setCurrentPolyphoneElement(null);
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

                const savedPosition = saveCursorPosition(editor);

                isUpdatingRef.current = true;
                if (!newHtml) {
                    editor.innerHTML = '<br>';
                } else {
                    editor.innerHTML = newHtml;
                }

                setTimeout(() => {
                    if (!editorRef.current) return;
                    const el = editorRef.current;

                    restoreCursorPosition(el, savedPosition);

                    const newScrollHeight = el.scrollHeight;
                    const delta = newScrollHeight - prevScrollHeight;
                    const targetScrollTop = prevScrollTop + delta;
                    el.scrollTop = Math.max(0, targetScrollTop);

                    isUpdatingRef.current = false;
                }, 0);
            }
        }, [renderedHtml]);

        // 实现 ref 方法
        useImperativeHandle(ref, () => ({
            getContainer: () => editorRef.current,
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
                const selectedText = range.toString();

                // 计算开始和结束位置
                const container = editorRef.current;
                let startPos = 0;
                let endPos = 0;

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
                let foundStart = false;
                while ((node = walker.nextNode())) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textLength = node.textContent?.length || 0;

                        if (node === range.startContainer) {
                            startPos += range.startOffset;
                            foundStart = true;
                        }

                        if (node === range.endContainer) {
                            endPos = startPos + (foundStart ? 0 : textLength) + range.endOffset;
                            break;
                        }

                        if (!foundStart) {
                            startPos += textLength;
                        } else {
                            endPos = startPos + textLength;
                        }
                    }
                }

                return { start: startPos, end: endPos, text: selectedText };
            },
            setCursorPosition: (position: number) => {
                if (!editorRef.current) return;
                restoreCursorPosition(editorRef.current, position);
            },
            focus: () => {
                editorRef.current?.focus();
            },
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
            }
        }));

        return (
            <>
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onClick={handleClick}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    className="segment-editor-content"
                    suppressContentEditableWarning
                    data-placeholder={placeholder}
                />

                {/* 下拉框组件 */}
                {isPauseDropdownOpen && (
                    <PauseDropdown
                        isOpen={isPauseDropdownOpen}
                        onClose={() => {
                            setIsPauseDropdownOpen(false);
                            setCurrentPauseElement(null);
                        }}
                        onSelect={handlePauseSelect}
                        position={pauseDropdownPosition}
                        selectedMs={
                            currentPauseElement
                                ? parseInt(currentPauseElement.getAttribute('data-pause-ms') || '0', 10) || null
                                : null
                        }
                    />
                )}

                {isSpeedDropdownOpen && (
                    <SpeedDropdown
                        isOpen={isSpeedDropdownOpen}
                        onClose={() => setIsSpeedDropdownOpen(false)}
                        onSelect={handleSpeedSelect}
                        position={speedDropdownPosition}
                    />
                )}

                {isNumberReadingDropdownOpen && (
                    <NumberReadingDropdown
                        isOpen={isNumberReadingDropdownOpen}
                        onClose={() => setIsNumberReadingDropdownOpen(false)}
                        onSelect={handleNumberReadingSelect}
                        position={numberReadingDropdownPosition}
                    />
                )}

                {isPolyphoneDropdownOpen && (
                    <PolyphoneDropdown
                        isOpen={isPolyphoneDropdownOpen}
                        onClose={() => setIsPolyphoneDropdownOpen(false)}
                        onSelect={handlePolyphoneSelect}
                        position={polyphoneDropdownPosition}
                        originalChar={currentPolyphoneChar}
                        options={currentPolyphoneOptions}
                    />
                )}
            </>
        );
    }
);

SegmentEditor.displayName = 'SegmentEditor';
