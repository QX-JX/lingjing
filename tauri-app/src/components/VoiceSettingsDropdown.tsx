import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { VoiceSelector } from './VoiceSelector';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { t } from '../locales';

interface VoiceSettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  voiceId: string;
  voiceName: string;
  voiceAvatar: string;
  onVoiceChange: (voiceId: string, voiceName: string, voiceAvatar: string, gender?: string) => void;
  onConfigChange?: (config: { speed: number; pitch: number; volume: number }) => void;
}

export function VoiceSettingsDropdown({
  isOpen,
  onClose,
  position,
  voiceId,
  voiceName,
  voiceAvatar,
  onVoiceChange,
  onConfigChange,
}: VoiceSettingsDropdownProps) {
  const { setCurrentVoice, audioConfig, setAudioConfig } = useAppStore();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [localConfig, setLocalConfig] = useState({
    speed: audioConfig.speed,
    pitch: audioConfig.pitch,
    volume: audioConfig.volume,
  });

  // 同步外部配置变化
  useEffect(() => {
    setLocalConfig({
      speed: audioConfig.speed,
      pitch: audioConfig.pitch,
      volume: audioConfig.volume,
    });
  }, [audioConfig]);

  // 点击外部关闭（但不包括 VoiceSelector）
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      // 如果 VoiceSelector 打开，不关闭下拉菜单
      if (isSelectorOpen) return;
      
      const target = event.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        // 检查是否点击在 VoiceSelector 上
        const voiceSelector = document.querySelector('[class*="fixed inset-0 bg-black/50"]');
        if (voiceSelector && voiceSelector.contains(target)) {
          return;
        }
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, isSelectorOpen]);

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

  // 更新语速
  const handleSpeedChange = (speed: number) => {
    const newConfig = { ...localConfig, speed };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 更新音量（0-10 映射到 0-1）
  const handleVolumeChange = (volume: number) => {
    const normalizedVolume = volume / 10;
    const newConfig = { ...localConfig, volume: normalizedVolume };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 更新音调（0-10 映射到 0.5-2.0）
  const handlePitchChange = (pitch: number) => {
    const normalizedPitch = 0.5 + (pitch / 10) * 1.5;
    const newConfig = { ...localConfig, pitch: normalizedPitch };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  if (!isOpen) return null;

  // 确定头像显示
  const displayAvatar = voiceAvatar || getVoiceAvatar(voiceId, voiceName, 'male');
  // 检查是否是图片 URL（包括相对路径、绝对路径、file:// 协议等）
  const isImageUrl =
    displayAvatar.startsWith('http://') ||
    displayAvatar.startsWith('https://') ||
    displayAvatar.startsWith('file://') ||
    displayAvatar.startsWith('app://') ||
    ((displayAvatar.startsWith('/') || displayAvatar.startsWith('./')) && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(displayAvatar)) ||
    // 如果路径包含图片扩展名且长度合理，也认为是图片 URL
    (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(displayAvatar) && displayAvatar.length > 5);

  // 计算面板位置，确保不超出屏幕边界
  const panelWidth = 280;
  const panelHeight = 240; // 与主输入区约一半高度相当，用于边界推算
  const padding = 10;
  
  let left = position.x;
  let top = position.y;
  let transform = 'translateX(-50%)';
  
  // 检查右边界
  if (left + panelWidth / 2 > window.innerWidth - padding) {
    left = window.innerWidth - panelWidth / 2 - padding;
  }
  // 检查左边界
  if (left - panelWidth / 2 < padding) {
    left = panelWidth / 2 + padding;
    transform = 'translateX(0)';
  }
  // 检查下边界
  if (top + panelHeight > window.innerHeight - padding) {
    top = window.innerHeight - panelHeight - padding;
  }
  // 检查上边界
  if (top < padding) {
    top = padding;
  }

  return (
    <>
      {/* 半透明遮罩层 */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className="fixed z-50 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg shadow-md shadow-orange-100 border border-orange-200 w-[280px] max-h-[min(240px,50vh)] overflow-y-auto p-2.5"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          transform: transform,
        }}
      >
        {/* 头部：头像、名称、更多按钮 */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-orange-200">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-orange-400 shadow-sm flex-shrink-0">
            {isImageUrl ? (
              <img
                src={displayAvatar}
                alt={voiceName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className =
                    'w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold';
                  fallback.textContent = voiceName.charAt(0);
                  target.parentNode?.appendChild(fallback);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold">
                {displayAvatar}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">
              {(() => {
                const translated = t(`voices.${voiceId}`);
                return translated === `voices.${voiceId}` ? voiceName : translated;
              })()}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSelectorOpen(true);
            }}
            className="flex-shrink-0 text-xs text-gray-700 bg-white border border-gray-300 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 rounded-md px-2 py-1 whitespace-nowrap transition-colors duration-200 shadow-sm"
          >
            {t('voice.more')}
          </button>
        </div>

        {/* 语速调节 */}
        <div className="mb-2">
          <label className="block text-xs text-gray-600 mb-1">
            {t('voice.speed')}: {localConfig.speed.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={localConfig.speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            style={{
              background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((localConfig.speed - 0.5) / 1.5) * 100}%, #e5e7eb ${((localConfig.speed - 0.5) / 1.5) * 100}%, #e5e7eb 100%)`,
            }}
          />
        </div>

        {/* 音量调节 */}
        <div className="mb-2">
          <div className="text-xs text-gray-700 mb-1">{t('voice.volume')}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">{t('voice.small')}</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={Math.round(localConfig.volume * 10)}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #fb923c 0%, #fb923c ${localConfig.volume * 100}%, #e5e7eb ${localConfig.volume * 100}%, #e5e7eb 100%)`,
              }}
            />
            <span className="text-xs text-gray-500 w-6">{t('voice.large')}</span>
          </div>
          <div className="text-center mt-0.5">
            <span className="text-xs text-gray-600">{Math.round(localConfig.volume * 10)}</span>
          </div>
        </div>

        {/* 音调调节 */}
        <div>
          <div className="text-xs text-gray-700 mb-1">{t('voice.pitch')}</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">{t('voice.low')}</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={Math.round(((localConfig.pitch - 0.5) / 1.5) * 10)}
              onChange={(e) => handlePitchChange(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((localConfig.pitch - 0.5) / 1.5) * 100}%, #e5e7eb ${((localConfig.pitch - 0.5) / 1.5) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <span className="text-xs text-gray-500 w-6">{t('voice.high')}</span>
          </div>
          {/* 显示音调数值 */}
          <div className="text-center mt-0.5">
            <span className="text-xs text-gray-600">
              {Math.round(((localConfig.pitch - 0.5) / 1.5) * 10)}
            </span>
          </div>
        </div>
      </div>

      {/* 发音人选择器 */}
      {isSelectorOpen && (
        <VoiceSelector
          isOpen={isSelectorOpen}
          onClose={() => setIsSelectorOpen(false)}
          onVoiceSelect={(voice) => {
            onVoiceChange(voice.id, voice.name, voice.avatar, voice.gender);
            setIsSelectorOpen(false);
          }}
        />
      )}
    </>
  );
}
