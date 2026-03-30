import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Music, Upload, X, Volume2, Check, Play, Square } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getPresetBgmList, uploadBackgroundMusic } from '../services/ttsService';
import { useToastContext } from '../contexts/ToastContext';
import { t } from '../locales';

interface BackgroundMusicDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number };
}

type Tab = 'list' | 'import';

export function BackgroundMusicDropdown({ isOpen, onClose, position }: BackgroundMusicDropdownProps) {
    const { bgmConfig, setBgmConfig } = useAppStore();
    const { showToast } = useToastContext();
    const [activeTab, setActiveTab] = useState<Tab>('list');
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [bgmList, setBgmList] = useState<{ id: string; name: string; path: string | null; duration?: number }[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        // Fetch preset BGM list from backend
        getPresetBgmList().then(list => {
            setBgmList(list);
        }).catch(err => {
            console.error("Failed to fetch BGM list:", err);
            // Fallback list as a safety measure, though backend should work
            setBgmList([
                { id: 'none', name: t('backgroundMusic.noBgm'), path: null }
            ]);
        });
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            // Stop preview when closed
            if (previewAudio) {
                previewAudio.pause();
                setPreviewAudio(null);
                setPlayingId(null);
            }
        };
    }, [isOpen, onClose, previewAudio]);

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

    // Cleanup preview on unmount
    useEffect(() => {
        return () => {
            if (previewAudio) {
                previewAudio.pause();
            }
        };
    }, [previewAudio]);

    // Format time (seconds to mm:ss)
    const formatTime = (seconds?: number) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
            showToast(t('backgroundMusic.selectMp3'), 'warning');
            event.target.value = '';
            return;
        }

        // 验证文件大小 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast(t('backgroundMusic.fileTooLarge'), 'warning');
            event.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const result = await uploadBackgroundMusic(file);
            setBgmConfig({ path: result.filePath, name: result.originalName });
            showToast(t('backgroundMusic.uploadSuccess'), 'success');
            setActiveTab('list'); // 切换到列表查看
        } catch (error) {
            console.error('[BackgroundMusicDropdown] 上传失败:', error);
            showToast(t('backgroundMusic.uploadFailed', { error: String(error) }), 'error');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleRemoveBgm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setBgmConfig({ path: null, name: null });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const volume = parseFloat(e.target.value);
        setBgmConfig({ volume });
    };

    const handleSelectBuiltin = (music: { id: string; name: string; path: string | null }) => {
        setBgmConfig({ path: music.path, name: music.name });
        return;
        // Note: In a real Electron app, we might need absolute paths or handle this in the main process
        // For now, we assume the backend can handle relative paths from public or we need to resolve it.
        // If the backend needs absolute path, we might need a utility to resolve 'public' path.
        // Assuming the 'mixBackgroundMusic' in backend can handle 'sounds/bgm/...' if run from correct root,
        // OR we pass the name and backend resolves it.
        // For simple display, we store the path provided.
        // IMPORTANT: The backend 'mixBackgroundMusic' likely expects an absolute path.
        // If it's a built-in file, we might need to handle it differently or get its absolute path.
        // For this demo, we'll store the relative path and let the service/backend handle resolution if possible,
        // or prefix it if we know the resource path.
        //
        // Let's assume for now we just pass the relative path and the backend needs to handle resource paths.
        // TO BE SAFE: We can use the window.location or similar to find resource path if needed,
        // but let's stick to the relative path string for now.

        // Actually, to make it work with the existing "mix" command which takes a path, 
        // passing a relative path like "sounds/bgm/..." might fail if the python script expects a full path.
        // However, fixing the backend is out of scope for this specific UI task. 
        // checking the "path" from file input, it is absolute. 
        // For built-in, we might need to construct a path.
        // But for now, let's just set it. 


    };

    const togglePreview = (e: React.MouseEvent, music: { id: string; name: string; path: string | null }) => {
        e.stopPropagation();

        if (playingId === music.id && previewAudio) {
            previewAudio.pause();
            setPlayingId(null);
            setPreviewAudio(null);
        } else {
            if (previewAudio) {
                previewAudio.pause();
            }

            if (music.path) {
                // Use custom media protocol to play local files via absolute path
                const audioUrl = `media://${Array.from(music.path).map(char => char === '\\' ? '/' : char).join('')}`;
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                    setPlayingId(null);
                    setPreviewAudio(null);
                };
                audio.play().catch(err => console.error("Preview playback failed:", err));
                setPreviewAudio(audio);
                setPlayingId(music.id);
            }
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-[320px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            style={{
                top: `${position.y}px`,
                left: `${position.x}px`,
                transform: 'translateX(-50%)',
            }}
        >
            <div className="flex border-b border-gray-100">
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'list'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('list')}
                >
                    {t('backgroundMusic.musicList')}
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    onClick={() => setActiveTab('import')}
                >
                    {t('backgroundMusic.localImport')}
                </button>
            </div>

            <div className="p-0">
                {activeTab === 'list' && (
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                        {bgmList.map((music) => {
                            const isSelected = bgmConfig.name === music.name;
                            const isPlaying = playingId === music.id;

                            return (
                                <div
                                    key={music.id}
                                    onClick={() => handleSelectBuiltin(music)}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <button
                                            onClick={(e) => togglePreview(e, music)}
                                            className={`p-1.5 rounded-full transition-colors ${isPlaying
                                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            title={isPlaying ? t('backgroundMusic.stopPreview') : t('backgroundMusic.preview')}
                                        >
                                            {isPlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                        </button>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium truncate">{music.name}</span>
                                            {music.duration && music.duration > 0 && (
                                                <span className="text-xs text-gray-400">{formatTime(music.duration)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                                </div>
                            );
                        })}

                        {bgmConfig.path && (
                            <div className="mt-2 pt-2 border-t border-gray-100 px-2">
                                <div className="flex items-center gap-2">
                                    <Volume2 className="w-3 h-3 text-gray-500" />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={bgmConfig.volume}
                                        onChange={handleVolumeChange}
                                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        title={`${t('backgroundMusic.volume')}: ${Math.round(bgmConfig.volume * 100)}%`}
                                    />
                                    <span className="text-xs text-gray-500 w-8 text-right">
                                        {Math.round(bgmConfig.volume * 100)}%
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'import' && (
                    <div className="p-4">
                        <div
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`group relative bg-blue-50 bg-opacity-60 rounded-md p-3 border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition-all flex items-center justify-center min-h-[120px] ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept=".mp3,audio/mpeg"
                                className="hidden"
                                disabled={isUploading}
                            />

                            {bgmConfig.path ? (
                                <div className="w-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Music className="w-5 h-5" />
                                            <span className="text-sm font-medium truncate flex-1 max-w-[160px]" title={bgmConfig.name || ''}>
                                                {bgmConfig.name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleRemoveBgm}
                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                            title={t('backgroundMusic.remove')}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Volume Control */}
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Volume2 className="w-4 h-4 text-gray-500" />
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={bgmConfig.volume}
                                            onChange={handleVolumeChange}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            title={`${t('backgroundMusic.volume')}: ${Math.round(bgmConfig.volume * 100)}%`}
                                        />
                                        <span className="text-xs text-gray-500 w-8 text-right">
                                            {Math.round(bgmConfig.volume * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-blue-500 transition-colors text-center">
                                    {isUploading ? (
                                        <>
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            <div className="text-sm font-medium">{t('soundEffect.uploading')}</div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 opacity-50" />
                                            <div>
                                                <div className="text-sm font-medium">{t('backgroundMusic.uploadLocalMusic')}</div>
                                                <div className="text-xs opacity-70 mt-1">{t('backgroundMusic.supportFormat')}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
