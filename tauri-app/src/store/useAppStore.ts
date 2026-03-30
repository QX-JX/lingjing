import { create } from 'zustand';
import { getVoiceAvatar } from '../config/voiceAvatars';

// 编辑历史记录
interface HistoryItem {
  text: string;
  timestamp: number;
}

// 发音人配置
interface VoiceConfig {
  id: string;
  name: string;
  avatar: string; // 头像 URL 或字符
  gender?: 'male' | 'female'; // 性别，用于生成真人头像
  speed: number; // 语速 0.5-2.0
  pitch: number; // 音调 0.5-2.0
  volume: number; // 音量 0-1
}

// 用户信息
export interface UserInfo {
  nickname: string;
  avatar: string;
}

// 自定义音效
export interface CustomSoundEffect {
  id: string;
  name: string;
  fileName: string;
  filePath: string; // 本地文件路径
  duration: number; // 毫秒
  uploadTime: number; // 上传时间戳
}

// 历史备份记录
export interface HistoryBackupRecord {
  id: string;
  text: string;
  title: string;
  voiceConfig: VoiceConfig | null;
  audioConfig: {
    speed: number;
    pitch: number;
    volume: number;
  } | null;
  bgmConfig: {
    path: string | null;
    name: string | null;
    volume: number;
  } | null;
  timestamp: number;
  characterCount: number;
}

// 应用状态
interface AppState {
  // 用户相关
  token: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;

  // 语言相关
  locale: string;
  setLocale: (locale: string) => void;

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

  // 背景音乐配置
  bgmConfig: {
    path: string | null;
    name: string | null;
    volume: number; // 0-1
  };

  // 自定义音效
  customSoundEffects: CustomSoundEffect[];

  // 历史备份记录
  historyRecords: HistoryBackupRecord[];
  isHistoryPanelOpen: boolean;

  // 操作函数
  setText: (text: string) => void;
  setTextWithoutHistory: (text: string) => void; // 设置文本但不触发历史记录
  addToHistory: (text: string) => void;
  undo: () => void;
  redo: () => void;
  clearText: () => void;
  setCurrentVoice: (voice: VoiceConfig) => void;
  setAudioConfig: (config: Partial<AppState['audioConfig']>) => void;
  setBgmConfig: (config: Partial<AppState['bgmConfig']>) => void;
  addCustomSoundEffect: (sound: CustomSoundEffect) => void;
  removeCustomSoundEffect: (id: string) => void;
  setCustomSoundEffects: (sounds: CustomSoundEffect[]) => void;

  // 历史记录操作
  setHistoryRecords: (records: HistoryBackupRecord[]) => void;
  addHistoryRecord: (record: HistoryBackupRecord) => void;
  removeHistoryRecord: (id: string) => void;
  clearHistoryRecords: () => void;
  toggleHistoryPanel: () => void;
  setHistoryPanelOpen: (isOpen: boolean) => void;
  loadHistoryRecord: (record: HistoryBackupRecord) => void;

  // 用户操作
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
  updateUser: (user: UserInfo) => void;
}

// 默认发音人
const defaultVoice: VoiceConfig = (() => {
  const avatar = getVoiceAvatar('zhiwei', '云希 (男)', 'male');
  console.log('[useAppStore] 初始化默认发音人头像:', {
    voiceId: 'zhiwei',
    avatar,
    avatarType: typeof avatar,
    isElectron: typeof window !== 'undefined' && 'electronAPI' in window,
  });
  return {
    id: 'zhiwei',
    name: '云希 (男)',
    avatar,
    gender: 'male',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };
})();

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  isLoggedIn: !!localStorage.getItem('token'),
  locale: localStorage.getItem('locale') || 'zh_CN',

  // 设置语言
  setLocale: (locale: string) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
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
  bgmConfig: {
    path: null,
    name: null,
    volume: 0.3,
  },
  customSoundEffects: [],
  historyRecords: [],
  isHistoryPanelOpen: false,

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

  // 设置背景音乐配置
  setBgmConfig: (config: Partial<AppState['bgmConfig']>) => {
    set((state) => ({
      bgmConfig: { ...state.bgmConfig, ...config },
    }));
  },

  // 添加自定义音效
  addCustomSoundEffect: (sound: CustomSoundEffect) => {
    set((state) => ({
      customSoundEffects: [...state.customSoundEffects, sound],
    }));
  },

  // 删除自定义音效
  removeCustomSoundEffect: (id: string) => {
    set((state) => ({
      customSoundEffects: state.customSoundEffects.filter(s => s.id !== id),
    }));
  },

  // 设置自定义音效列表
  setCustomSoundEffects: (sounds: CustomSoundEffect[]) => {
    set({ customSoundEffects: sounds });
  },

  // ==================== 历史记录操作 ====================

  // 设置历史记录列表
  setHistoryRecords: (records: HistoryBackupRecord[]) => {
    set({ historyRecords: records });
  },

  // 添加历史记录
  addHistoryRecord: (record: HistoryBackupRecord) => {
    set((state) => ({
      historyRecords: [record, ...state.historyRecords],
    }));
  },

  // 删除历史记录
  removeHistoryRecord: (id: string) => {
    set((state) => ({
      historyRecords: state.historyRecords.filter(r => r.id !== id),
    }));
  },

  // 清空历史记录
  clearHistoryRecords: () => {
    set({ historyRecords: [] });
  },

  // 切换历史面板显示状态
  toggleHistoryPanel: () => {
    set((state) => ({
      isHistoryPanelOpen: !state.isHistoryPanelOpen,
    }));
  },

  // 设置历史面板显示状态
  setHistoryPanelOpen: (isOpen: boolean) => {
    set({ isHistoryPanelOpen: isOpen });
  },

  // 加载历史记录到编辑器
  loadHistoryRecord: (record: HistoryBackupRecord) => {
    const state = get();

    // 设置文本内容
    state.setTextWithoutHistory(record.text);
    state.addToHistory(record.text);

    // 设置发音人配置
    if (record.voiceConfig) {
      state.setCurrentVoice(record.voiceConfig);
    }

    // 设置音频配置
    if (record.audioConfig) {
      state.setAudioConfig(record.audioConfig);
    }

    // 设置背景音乐配置
    if (record.bgmConfig) {
      state.setBgmConfig(record.bgmConfig);
    }

    // 关闭历史面板
    state.setHistoryPanelOpen(false);
  },

  // ==================== 用户操作 ====================

  login: (token: string, user: UserInfo) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isLoggedIn: false });
  },

  updateUser: (user: UserInfo) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

}));
