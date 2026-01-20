import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { VoiceSelector } from './VoiceSelector';

export function VoiceCard() {
  const { currentVoice } = useAppStore();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const handleVoiceSelect = () => {
    setIsSelectorOpen(true);
  };

  return (
    <div
      onClick={handleVoiceSelect}
      className="absolute right-4 top-4 bg-gradient-to-r from-orange-50 to-rose-50 rounded-lg p-3 flex items-center gap-3 shadow-md shadow-orange-100 border border-orange-200 min-w-[200px] cursor-pointer hover:shadow-lg hover:shadow-orange-200 transition-all duration-200"
    >
      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
        {currentVoice.avatar}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-800">{currentVoice.name}</div>
      </div>
      <button className="text-orange-400 hover:text-orange-600 cursor-pointer transition-colors duration-200">
        →
      </button>
      
      {/* 发音人选择器 */}
      <VoiceSelector 
        isOpen={isSelectorOpen} 
        onClose={() => setIsSelectorOpen(false)} 
      />
    </div>
  );
}
