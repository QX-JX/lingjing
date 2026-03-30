import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { VoiceSelector } from './VoiceSelector';
import { t } from '../locales';

interface VoiceSettingsPanelProps {
  isVisible: boolean;
  onClose: () => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
}

export function VoiceSettingsPanel({
  isVisible,
  onClose,
  isSelectorOpen,
  setIsSelectorOpen
}: VoiceSettingsPanelProps) {
  const { currentVoice, setCurrentVoice, audioConfig, setAudioConfig } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [localConfig, setLocalConfig] = useState({
    speed: audioConfig.speed,
    pitch: audioConfig.pitch,
    volume: audioConfig.volume
  });

  useEffect(() => {
    setLocalConfig({
      speed: audioConfig.speed,
      pitch: audioConfig.pitch,
      volume: audioConfig.volume
    });
  }, [audioConfig]);

  const handleSpeedChange = (speed: number) => {
    const newConfig = { ...localConfig, speed };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    setCurrentVoice({ ...currentVoice, speed });
  };

  const handleVolumeChange = (volume: number) => {
    const normalizedVolume = volume / 10;
    const newConfig = { ...localConfig, volume: normalizedVolume };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    setCurrentVoice({ ...currentVoice, volume: normalizedVolume });
  };

  const handlePitchChange = (pitch: number) => {
    const normalizedPitch = 0.5 + (pitch / 10) * 1.5;
    const newConfig = { ...localConfig, pitch: normalizedPitch };
    setLocalConfig(newConfig);
    setAudioConfig(newConfig);
    setCurrentVoice({ ...currentVoice, pitch: normalizedPitch });
  };

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={panelRef}
        className="absolute top-[calc(100%-1px)] left-0 w-full bg-gradient-to-r from-orange-50 to-rose-50 rounded-b-[16px] shadow-md shadow-orange-100 border-l border-r border-b border-orange-200 z-50 px-3 py-2 max-h-[200px] overflow-y-auto"
        onMouseEnter={() => undefined}
        onMouseLeave={onClose}
      >
        <div className="grid grid-rows-3 gap-0">
        <div className="flex flex-col justify-center border-b border-orange-100/80 pb-1.5">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="text-[15px] font-medium text-slate-800">{t('voice.speed')}:</div>
            <div className="text-[15px] font-medium text-slate-700">{localConfig.speed.toFixed(1)}x</div>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={localConfig.speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            style={{
              background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((localConfig.speed - 0.5) / 1.5) * 100}%, #e5e7eb ${((localConfig.speed - 0.5) / 1.5) * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        <div className="flex flex-col justify-center border-b border-orange-100/80 py-1.5">
          <div className="mb-0.5 text-[15px] font-medium text-slate-800">{t('voice.volume')}</div>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-slate-500 w-4 flex-shrink-0">{t('voice.small')}</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={Math.round(localConfig.volume * 10)}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #fb923c 0%, #fb923c ${localConfig.volume * 100}%, #e5e7eb ${localConfig.volume * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className="text-[13px] text-slate-500 w-4 flex-shrink-0">{t('voice.large')}</span>
          </div>
          <div className="mt-0.5 text-center text-[15px] font-medium text-slate-700">{Math.round(localConfig.volume * 10)}</div>
        </div>

        <div className="flex flex-col justify-center pt-1.5">
          <div className="mb-0.5 text-[15px] font-medium text-slate-800">{t('voice.pitch')}</div>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-slate-500 w-4 flex-shrink-0">{t('voice.low')}</span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={Math.round(((localConfig.pitch - 0.5) / 1.5) * 10)}
              onChange={(e) => handlePitchChange(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              style={{
                background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((localConfig.pitch - 0.5) / 1.5) * 100}%, #e5e7eb ${((localConfig.pitch - 0.5) / 1.5) * 100}%, #e5e7eb 100%)`
              }}
            />
            <span className="text-[13px] text-slate-500 w-4 flex-shrink-0">{t('voice.high')}</span>
          </div>
          <div className="mt-0.5 text-center text-[15px] font-medium text-slate-700">
            {Math.round(((localConfig.pitch - 0.5) / 1.5) * 10)}
          </div>
        </div>
        </div>
      </div>

      <VoiceSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
      />
    </>
  );
}
