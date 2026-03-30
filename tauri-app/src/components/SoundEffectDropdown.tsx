import { useState, useEffect, useRef } from 'react';
import { SOUND_EFFECTS, getSoundEffectPath, SOUND_CATEGORIES, type SoundEffect } from '../config/soundEffects';
import { useAppStore } from '../store/useAppStore';
import { uploadCustomSound, deleteCustomSound } from '../services/ttsService';
import { Search, Heart } from 'lucide-react';
import './SoundEffectDropdown.css';
import { t } from '../locales';

interface SoundEffectDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (effectId: string) => void;
    position: { x: number; y: number };
}

// 格式化时长（毫秒转 m:ss）
function formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '0:00';
    // 将毫秒转换为秒，向上取整
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function SoundEffectDropdown({
    isOpen,
    onClose,
    onSelect,
    position
}: SoundEffectDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('全部');
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [effectDurations, setEffectDurations] = useState<Map<string, number>>(new Map());

    const { customSoundEffects, addCustomSoundEffect, removeCustomSoundEffect } = useAppStore();

    // 获取音效的实际时长
    const getEffectDuration = async (effectId: string, effectPath: string): Promise<number> => {
        // 如果已经有缓存的时长，直接返回
        if (effectDurations.has(effectId)) {
            return effectDurations.get(effectId)!;
        }

        return new Promise((resolve) => {
            const audio = new Audio(effectPath);
            const handleLoadedMetadata = () => {
                const duration = audio.duration * 1000; // 转换为毫秒
                setEffectDurations(prev => new Map(prev).set(effectId, duration));
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('error', handleError);
                audio.src = '';
                resolve(duration);
            };
            const handleError = (e: Event) => {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('error', handleError);
                audio.src = '';
                resolve(0);
            };
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('error', handleError);
            audio.src = effectPath;
        });
    };

    // 点击外部关闭
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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

    // 组件卸载时停止音频
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // 加载所有音效的实际时长（包括预置音效和自定义音效）
    useEffect(() => {
        if (!isOpen) return;

        const loadAllDurations = async () => {
            const results: Array<{ id: string; name: string; configMs: number; actualMs: number; diff: number }> = [];

            // 加载预置音效的实际时长
            for (const effect of SOUND_EFFECTS) {
                try {
                    const actualDuration = await getEffectDuration(effect.id, getSoundEffectPath(effect.id));
                    if (actualDuration > 0) {
                        const diff = Math.round(actualDuration - effect.duration);
                        results.push({
                            id: effect.id,
                            name: effect.name,
                            configMs: effect.duration,
                            actualMs: Math.round(actualDuration),
                            diff
                        });
                    }
                } catch (error) {
                    // 静默处理错误
                }
            }

            // 加载自定义音效的实际时长
            for (const custom of customSoundEffects) {
                try {
                    const actualDuration = await getEffectDuration(custom.id, getSoundEffectPath(custom.id));
                    if (actualDuration > 0) {
                        const configMs = custom.duration || 0;
                        const diff = Math.round(actualDuration - configMs);
                        results.push({
                            id: custom.id,
                            name: custom.name,
                            configMs,
                            actualMs: Math.round(actualDuration),
                            diff
                        });
                    }
                } catch (error) {
                    // 静默处理错误
                }
            }
        };

        loadAllDurations();
    }, [isOpen, customSoundEffects]);

    if (!isOpen) return null;

    const handlePreview = (effectPath: string) => {
        try {
            console.log('[SoundEffectDropdown] 开始播放音效:', {
                effectPath,
                isElectron: typeof window !== 'undefined' && 'electronAPI' in window,
                userAgent: navigator.userAgent
            });

            // 停止当前播放
            if (audioRef.current) {
                audioRef.current.pause();
            }

            // 播放新音效
            const audio = new Audio(effectPath);
            audio.volume = 0.7; // 70%音量

            // 添加详细的错误监听
            audio.addEventListener('error', (e) => {
                const error = audio.error;
                console.error('[SoundEffectDropdown] 音效加载错误:', {
                    errorCode: error?.code,
                    errorMessage: error?.message,
                    effectPath,
                    networkState: audio.networkState,
                    readyState: audio.readyState,
                    src: audio.src
                });
            });

            // 监听元数据加载，获取实际时长
            audio.addEventListener('loadedmetadata', () => {
                console.log('[SoundEffectDropdown] 音效元数据加载成功:', {
                    effectPath,
                    duration: audio.duration,
                    readyState: audio.readyState
                });
            });

            audio.addEventListener('canplay', () => {
                console.log('[SoundEffectDropdown] 音效可以播放:', {
                    effectPath,
                    readyState: audio.readyState
                });
            });

            audio.addEventListener('loadstart', () => {
                console.log('[SoundEffectDropdown] 音效开始加载:', {
                    effectPath,
                    networkState: audio.networkState
                });
            });

            audio.play().catch(error => {
                console.error('[SoundEffectDropdown] 音效播放失败:', {
                    error,
                    errorMessage: error.message,
                    errorName: error.name,
                    effectPath,
                    networkState: audio.networkState,
                    readyState: audio.readyState,
                    src: audio.src
                });
            });
            audioRef.current = audio;
        } catch (error) {
            console.error('[SoundEffectDropdown] 音效加载失败:', {
                error,
                errorMessage: error instanceof Error ? error.message : String(error),
                effectPath
            });
        }
    };

    const handleSelect = (effectId: string) => {
        // 停止预览
        if (audioRef.current) {
            audioRef.current.pause();
        }
        onSelect(effectId);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 验证文件类型
        if (!file.name.toLowerCase().endsWith('.mp3')) {
            alert(t('backgroundMusic.selectMp3'));
            event.target.value = '';
            return;
        }

        // 验证文件大小 (2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(t('import.fileTooLarge'));
            event.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const result = await uploadCustomSound(file);

            // 添加到store
            addCustomSoundEffect({
                id: `custom_${result.fileName}`,
                name: result.originalName,
                fileName: result.fileName,
                filePath: result.filePath,
                duration: 0, // 可以后续通过audio元素获取
                uploadTime: Date.now()
            });

            alert(t('backgroundMusic.uploadSuccess'));
            setActiveTab('list'); // 切换到列表查看
        } catch (error) {
            console.error('[SoundEffectDropdown] 上传失败:', error);
            alert(t('backgroundMusic.uploadFailed', { error: String(error) }));
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleDelete = async (sound: any) => {
        if (!confirm(t('soundEffect.confirmDelete', { name: sound.name }))) {
            return;
        }

        try {
            await deleteCustomSound(sound.fileName);
            removeCustomSoundEffect(sound.id);
        } catch (error) {
            console.error('[SoundEffectDropdown] 删除失败:', error);
            alert(t('backgroundMusic.uploadFailed', { error: String(error) }));
        }
    };

    // 切换收藏
    const handleToggleFavorite = (effectId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(effectId)) {
                newFavorites.delete(effectId);
            } else {
                newFavorites.add(effectId);
            }
            return newFavorites;
        });
    };

    // 获取所有音效（包括自定义音效）
    const getAllEffects = (): Array<SoundEffect & { id: string; isCustom?: boolean; actualDuration?: number }> => {
        const allEffects: Array<SoundEffect & { id: string; isCustom?: boolean; actualDuration?: number }> = [
            ...SOUND_EFFECTS.map(e => ({
                ...e,
                isCustom: false,
                actualDuration: effectDurations.get(e.id) || e.duration
            })),
            ...customSoundEffects.map(custom => ({
                id: custom.id,
                name: custom.name,
                fileName: custom.fileName,
                category: '环境' as const,
                duration: custom.duration || 0,
                icon: '🎵',
                isCustom: true,
                actualDuration: effectDurations.get(custom.id) || custom.duration || 0
            }))
        ];

        // 搜索过滤
        if (searchQuery.trim()) {
            return allEffects.filter(effect =>
                effect.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 分类过滤
        if (selectedCategory === '全部') {
            return allEffects;
        } else if (selectedCategory === '我的收藏') {
            return allEffects.filter(effect => favorites.has(effect.id));
        } else {
            return allEffects.filter(effect => effect.category === selectedCategory);
        }
    };

    const filteredEffects = getAllEffects();

    // 计算分类数量
    const getCategoryCount = (category: string): number => {
        if (category === '全部') {
            return SOUND_EFFECTS.length + customSoundEffects.length;
        } else if (category === '我的收藏') {
            return favorites.size;
        } else {
            return SOUND_EFFECTS.filter(e => e.category === category).length;
        }
    };

    const categories = ['全部', ...SOUND_CATEGORIES, '我的收藏'];

    return (
        <div
            ref={dropdownRef}
            className="sound-effect-dropdown"
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)'
            }}
        >
            <div className="sound-effect-dropdown-arrow" />

            <div className="sound-effect-dropdown-header">
                <span className="sound-effect-dropdown-title">{t('soundEffect.title')}</span>
                <button
                    className="sound-effect-dropdown-close"
                    onClick={onClose}
                    aria-label={t('header.close')}
                >
                    ×
                </button>
            </div>

            {/* Tab 导航 */}
            <div className="sound-effect-tabs">
                <button
                    className={`sound-effect-tab ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    {t('soundEffect.musicList')}
                </button>
                <button
                    className={`sound-effect-tab ${activeTab === 'import' ? 'active' : ''}`}
                    onClick={() => setActiveTab('import')}
                >
                    {t('soundEffect.localImport')}
                </button>
            </div>

            <div className="sound-effect-dropdown-content">
                {activeTab === 'list' ? (
                    <>
                        {/* 搜索框 */}
                        <div className="sound-effect-search-container">
                            <div className="sound-effect-search-wrapper">
                                <Search className="sound-effect-search-icon" size={16} />
                                <input
                                    type="text"
                                    className="sound-effect-search-input"
                                    placeholder={t('soundEffect.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 分类标签 */}
                        <div className="sound-effect-categories">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    className={`sound-effect-category-tag ${selectedCategory === category ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(category)}
                                >
                                    {category}({getCategoryCount(category)})
                                </button>
                            ))}
                        </div>

                        {/* 音效列表 - 网格布局 */}
                        <div className="sound-effect-grid">
                            {filteredEffects.map(effect => (
                                <div
                                    key={effect.id}
                                    className="sound-effect-grid-item"
                                    onClick={() => handleSelect(effect.id)}
                                >
                                    {/* 播放按钮 */}
                                    <button
                                        className="sound-effect-play-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePreview(getSoundEffectPath(effect.id));
                                        }}
                                        title={t('soundEffect.play')}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </button>

                                    {/* 音效名称 */}
                                    <span className="sound-effect-grid-name">{effect.name}</span>

                                    {/* 时长 */}
                                    <span className="sound-effect-grid-duration">
                                        {formatDuration(effect.actualDuration || effect.duration)}
                                    </span>

                                    {/* 收藏按钮 */}
                                    <button
                                        className={`sound-effect-favorite-btn ${favorites.has(effect.id) ? 'active' : ''}`}
                                        onClick={(e) => handleToggleFavorite(effect.id, e)}
                                        title={favorites.has(effect.id) ? t('soundEffect.unfavorite') : t('soundEffect.favorite')}
                                    >
                                        <Heart size={14} fill={favorites.has(effect.id) ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {filteredEffects.length === 0 && (
                            <div className="sound-effect-empty">
                                {searchQuery ? t('soundEffect.noResults') : t('soundEffect.noEffects')}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="sound-effect-import-tab">
                        <div
                            className={`sound-effect-upload-area ${isUploading ? 'uploading' : ''}`}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                        >
                            <div className="upload-icon">📁</div>
                            <div className="upload-text">
                                {isUploading ? t('soundEffect.uploading') : t('soundEffect.uploadFromLocal')}
                            </div>
                            <div className="upload-hint">{t('soundEffect.uploadHint')}</div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".mp3,audio/mpeg"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />

                        <div className="sound-effect-import-stats">
                            <span>{t('soundEffect.totalEffects', { count: customSoundEffects.length })}</span>
                            {customSoundEffects.length > 0 && (
                                <button
                                    className="manage-btn"
                                    onClick={() => setActiveTab('list')}
                                >
                                    {t('soundEffect.manage')}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
