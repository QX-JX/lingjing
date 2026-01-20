import { create } from 'zustand';

// 编辑历史记录
interface HistoryItem {
  text: string;
  timestamp: number;
}

// 发音人配置
interface VoiceConfig {
  id: string;
  name: string;
  avatar: string;
  speed: number; // 语速 0.5-2.0
  pitch: number; // 音调 0.5-2.0
  volume: number; // 音量 0-1
}

// 应用状态
interface AppState {
  // 文本相关
  text: string;
  maxLength: number;
  
  // 编辑历史
  history: HistoryItem[];
  historyIndex: number;
  
  // 发音人配置
  currentVoice: VoiceConfig;
  
  // 音频配置
  audioConfig: {
    speed: number;
    pitch: number;
    volume: number;
  };
  
  // 操作函数
  setText: (text: string) => void;
  setTextWithoutHistory: (text: string) => void; // 设置文本但不触发历史记录
  addToHistory: (text: string) => void;
  undo: () => void;
  redo: () => void;
  clearText: () => void;
  setCurrentVoice: (voice: VoiceConfig) => void;
  setAudioConfig: (config: Partial<AppState['audioConfig']>) => void;
}

// 默认发音人
const defaultVoice: VoiceConfig = {
  id: 'zhiwei',
  name: '解说-知韦(紧凑版)',
  avatar: '知',
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  text: '',
  maxLength: 5000,
  history: [{ text: '', timestamp: Date.now() }],
  historyIndex: 0,
  currentVoice: defaultVoice,
  audioConfig: {
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },

  // 设置文本
  setText: (text: string) => {
    const currentText = get().text;
    if (text !== currentText) {
      set({ text });
      // 自动添加到历史记录（防抖逻辑在组件中处理）
    }
  },

  // 设置文本但不触发历史记录（用于撤销/重做）
  setTextWithoutHistory: (text: string) => {
    set({ text });
  },

  // 添加到历史记录
  addToHistory: (text: string) => {
    const { history, historyIndex } = get();
    // 移除当前索引之后的历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    // 添加新记录
    newHistory.push({ text, timestamp: Date.now() });
    // 限制历史记录数量（最多50条）
    const limitedHistory = newHistory.slice(-50);
    set({
      history: limitedHistory,
      historyIndex: limitedHistory.length - 1,
    });
  },

  // 撤销
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newText = history[newIndex].text;
      set({
        historyIndex: newIndex,
        text: newText,
      });
    }
  },

  // 重做
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newText = history[newIndex].text;
      set({
        historyIndex: newIndex,
        text: newText,
      });
    }
  },

  // 清除文本
  clearText: () => {
    set({ text: '' });
    get().addToHistory('');
  },

  // 设置当前发音人
  setCurrentVoice: (voice: VoiceConfig) => {
    set({ currentVoice: voice });
  },

  // 设置音频配置
  setAudioConfig: (config: Partial<AppState['audioConfig']>) => {
    set((state) => ({
      audioConfig: { ...state.audioConfig, ...config },
    }));
  },
}));
