import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';
import { t } from '../locales';

export function VoiceCard() {
  const { currentVoice } = useAppStore();
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const displayVoiceName = (() => {
    const translated = t(`voices.${currentVoice.id}`);
    return translated === `voices.${currentVoice.id}` ? currentVoice.name : translated;
  })();

  return (
    <div
      className={`voice-card-container relative ml-auto overflow-visible origin-top-right transition-[width] duration-300 ${isPanelVisible ? 'w-[258px]' : 'w-[184px]'}`}
      onMouseEnter={() => {
        setIsHovered(true);
        setIsPanelVisible(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPanelVisible(false);
      }}
    >
      <div
        className={`w-full bg-gradient-to-r from-orange-50 to-rose-50 px-4 py-5.5 flex items-center justify-between gap-2 shadow-sm shadow-orange-100 border border-orange-200 cursor-pointer hover:shadow-md hover:shadow-orange-200 transition-all duration-300 overflow-hidden ${isPanelVisible ? 'rounded-t-[16px] rounded-b-none border-b-orange-100' : 'rounded-[18px]'}`}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-orange-400 shadow-sm flex-shrink-0 bg-white">
          {(() => {
            const avatar = currentVoice.avatar;
            const isImageUrl = avatar.startsWith('http') ||
              avatar.startsWith('app://') ||
              avatar.startsWith('file://') ||
              (((avatar.startsWith('/') || avatar.startsWith('./')) &&
                /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(avatar)));

            return isImageUrl ? (
              <img
                src={avatar}
                alt={displayVoiceName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className =
                    'w-11 h-11 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white text-sm font-semibold';
                  fallback.textContent = displayVoiceName.charAt(0);
                  target.parentNode?.appendChild(fallback);
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {avatar}
              </div>
            );
          })()}
        </div>

        <div className="min-w-0 flex-1 flex items-center justify-start">
          <div className="text-[13px] font-medium text-gray-800 truncate leading-none text-left w-full min-w-0">
            {displayVoiceName}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSelectorOpen(true);
          }}
          className={`flex-shrink-0 text-xs font-medium text-gray-700 bg-white border border-slate-300 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 rounded-[10px] px-2.5 py-1.5 whitespace-nowrap transition-all duration-200 shadow-sm ${isPanelVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none w-0 min-w-0 px-0 py-0 border-transparent shadow-none overflow-hidden'}`}
        >
          {t('voice.more')}
        </button>
      </div>

      <VoiceSettingsPanel
        isVisible={isPanelVisible}
        onClose={() => setIsPanelVisible(false)}
        isSelectorOpen={isSelectorOpen}
        setIsSelectorOpen={setIsSelectorOpen}
      />
    </div>
  );
}
