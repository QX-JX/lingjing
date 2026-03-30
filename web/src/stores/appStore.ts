import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { PreviewState, TtsConfig, VoiceInfo } from '../services/webTtsService';
import { setAudioConfig as syncWebAudioConfig } from '../services/webTtsService';
import { getCuratedVoiceById } from '../config/voiceCatalog';

export interface TextMarker {
  type: 'voice' | 'speed' | 'pause' | 'reread' | 'number' | 'polyphone' | 'sound';
  start: number;
  end: number;
  attributes?: Record<string, string>;
}

export interface HistoryBackupRecord {
  id: string;
  text: string;
  title: string;
  voiceConfig: VoiceInfo | null;
  audioConfig: {
    speed: number;
    pitch: number;
    volume: number;
  } | null;
  bgmConfig: {
    path: string | null;
    name?: string | null;
    volume: number;
  } | null;
  timestamp: number;
  characterCount: number;
  assetSnapshot?: {
    soundEffects: Array<{ id?: string; name: string; url: string; duration?: number; size?: number }>;
    bgmTracks: Array<{ id?: string; name: string; url: string; duration?: number; size?: number }>;
  };
}

export interface EditorSelectionState {
  start: number;
  end: number;
  lastExpandedStart: number | null;
  lastExpandedEnd: number | null;
}

const HISTORY_BACKUP_KEY = 'lingjing_history_records';
const CUSTOM_SOUND_KEY = 'lingjing_custom_sound_effects';
const CUSTOM_BGM_KEY = 'lingjing_custom_bgm_tracks';

export const useAppStore = defineStore('app', () => {
  const text = ref('');
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const maxLength = 5000;

  const currentVoice = ref<VoiceInfo>({ ...getCuratedVoiceById('zhiwei') });

  const audioConfig = ref<TtsConfig>({
    voice_id: 'zhiwei',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
    bgmPath: null,
    bgmVolume: 0.3,
  });

  const isPlaying = ref(false);
  const previewState = ref<PreviewState>('idle');
  const previewProgress = ref(0);
  const isGenerating = ref(false);
  const generationProgress = ref(0);
  const showHistoryPanel = ref(false);
  const showImportDialog = ref(false);
  const showVoiceSelector = ref(false);
  const pendingVoiceWrap = ref<{ start: number; end: number } | null>(null);
  const pendingVoiceEdit = ref<{ start: number; end: number; voiceId: string } | null>(null);
  const historyRecords = ref<HistoryBackupRecord[]>([]);
  const editorSelection = ref<EditorSelectionState>({
    start: 0,
    end: 0,
    lastExpandedStart: null,
    lastExpandedEnd: null,
  });

  const charCount = computed(() => text.value.replace(/<[^>]+>/g, '').length);
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  syncWebAudioConfig(audioConfig.value);

  function loadHistoryRecords() {
    try {
      const cached = localStorage.getItem(HISTORY_BACKUP_KEY);
      historyRecords.value = cached ? (JSON.parse(cached) as HistoryBackupRecord[]) : [];
    } catch {
      historyRecords.value = [];
    }
  }

  function persistHistoryRecords() {
    localStorage.setItem(HISTORY_BACKUP_KEY, JSON.stringify(historyRecords.value));
  }

  function saveToHistory(newText: string) {
    if (historyIndex.value >= 0 && history.value[historyIndex.value] === newText) {
      return;
    }

    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    history.value.push(newText);
    historyIndex.value = history.value.length - 1;

    if (history.value.length > 50) {
      history.value.shift();
      historyIndex.value--;
    }
  }

  function setText(newText: string) {
    if (newText !== text.value) {
      text.value = newText;
    }
  }

  function setTextWithoutHistory(newText: string) {
    text.value = newText;
  }

  function setEditorSelection(range: { start: number; end: number }) {
    editorSelection.value.start = range.start;
    editorSelection.value.end = range.end;
    if (range.end > range.start) {
      editorSelection.value.lastExpandedStart = range.start;
      editorSelection.value.lastExpandedEnd = range.end;
    }
  }

  function clearLastExpandedSelection() {
    editorSelection.value.lastExpandedStart = null;
    editorSelection.value.lastExpandedEnd = null;
  }

  function addToHistory(newText: string) {
    saveToHistory(newText);
  }

  function undo() {
    if (canUndo.value) {
      historyIndex.value--;
      text.value = history.value[historyIndex.value];
    }
  }

  function redo() {
    if (canRedo.value) {
      historyIndex.value++;
      text.value = history.value[historyIndex.value];
    }
  }

  function clearText() {
    text.value = '';
    saveToHistory('');
  }

  function clearFormatOnly() {
    const plainText = text.value.replace(/<[^>]+>/g, '').trim();
    text.value = plainText;
    saveToHistory(plainText);
    return plainText;
  }

  function setCurrentVoice(voice: VoiceInfo) {
    currentVoice.value = voice;
    audioConfig.value.voice_id = voice.id;
    syncWebAudioConfig({ voice_id: voice.id });
  }

  function setAudioConfig(config: Partial<TtsConfig>) {
    audioConfig.value = { ...audioConfig.value, ...config };
    syncWebAudioConfig(config);
  }

  function setPlaying(playing: boolean) {
    isPlaying.value = playing;
  }

  function setPreviewState(state: PreviewState) {
    previewState.value = state;
    isPlaying.value = state === 'playing';
  }

  function setPreviewProgress(progress: number) {
    previewProgress.value = Math.max(0, Math.min(100, progress));
  }

  function resetPreview() {
    previewState.value = 'idle';
    previewProgress.value = 0;
    isPlaying.value = false;
  }

  function setGenerating(generating: boolean) {
    isGenerating.value = generating;
  }

  function setProgress(progress: number) {
    generationProgress.value = progress;
  }

  function toggleHistoryPanel() {
    showHistoryPanel.value = !showHistoryPanel.value;
  }

  function toggleImportDialog() {
    showImportDialog.value = !showImportDialog.value;
  }

  function toggleVoiceSelector() {
    showVoiceSelector.value = !showVoiceSelector.value;
  }

  function openVoiceSelector() {
    showVoiceSelector.value = true;
  }

  function openVoiceWrapSelector(range: { start: number; end: number }) {
    pendingVoiceWrap.value = range;
    pendingVoiceEdit.value = null;
    showVoiceSelector.value = true;
  }

  function openVoiceEditSelector(target: { start: number; end: number; voiceId: string }) {
    pendingVoiceEdit.value = target;
    pendingVoiceWrap.value = null;
    showVoiceSelector.value = true;
  }

  function closeVoiceSelector() {
    showVoiceSelector.value = false;
    pendingVoiceWrap.value = null;
    pendingVoiceEdit.value = null;
  }

  function consumePendingVoiceWrap() {
    const current = pendingVoiceWrap.value;
    pendingVoiceWrap.value = null;
    return current;
  }

  function consumePendingVoiceEdit() {
    const current = pendingVoiceEdit.value;
    pendingVoiceEdit.value = null;
    return current;
  }

  function restoreHistoryEntry(index: number) {
    if (index < 0 || index >= history.value.length) return;
    historyIndex.value = index;
    text.value = history.value[index];
  }

  function saveHistoryBackupRecord() {
    const plainText = text.value.replace(/<[^>]+>/g, '').trim();
    const soundEffects = JSON.parse(localStorage.getItem(CUSTOM_SOUND_KEY) || '[]') as HistoryBackupRecord['assetSnapshot']['soundEffects'];
    const bgmTracks = JSON.parse(localStorage.getItem(CUSTOM_BGM_KEY) || '[]') as HistoryBackupRecord['assetSnapshot']['bgmTracks'];
    const nextSnapshot = {
      text: text.value,
      voiceId: currentVoice.value?.id || null,
      speed: audioConfig.value.speed,
      pitch: audioConfig.value.pitch,
      volume: audioConfig.value.volume,
      bgmPath: audioConfig.value.bgmPath || null,
      bgmVolume: audioConfig.value.bgmVolume ?? 0.3,
    };

    const latestRecord = historyRecords.value[0];
    if (latestRecord) {
      const latestSnapshot = {
        text: latestRecord.text,
        voiceId: latestRecord.voiceConfig?.id || null,
        speed: latestRecord.audioConfig?.speed ?? 1,
        pitch: latestRecord.audioConfig?.pitch ?? 1,
        volume: latestRecord.audioConfig?.volume ?? 1,
        bgmPath: latestRecord.bgmConfig?.path ?? null,
        bgmVolume: latestRecord.bgmConfig?.volume ?? 0.3,
      };

      if (JSON.stringify(latestSnapshot) === JSON.stringify(nextSnapshot)) {
        return latestRecord;
      }
    }

    const record: HistoryBackupRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: text.value,
      title: plainText.slice(0, 30) || '未命名记录',
      voiceConfig: currentVoice.value || null,
      audioConfig: {
        speed: audioConfig.value.speed,
        pitch: audioConfig.value.pitch,
        volume: audioConfig.value.volume,
      },
      bgmConfig: {
        path: audioConfig.value.bgmPath || null,
        volume: audioConfig.value.bgmVolume ?? 0.3,
      },
      timestamp: Date.now(),
      characterCount: plainText.length,
      assetSnapshot: {
        soundEffects,
        bgmTracks,
      },
    };

    historyRecords.value = [record, ...historyRecords.value].slice(0, 100);
    persistHistoryRecords();
    return record;
  }

  function deleteHistoryBackupRecord(id: string) {
    historyRecords.value = historyRecords.value.filter((record) => record.id !== id);
    persistHistoryRecords();
  }

  function clearHistoryBackupRecords() {
    historyRecords.value = [];
    persistHistoryRecords();
  }

  function loadHistoryBackupRecord(record: HistoryBackupRecord) {
    text.value = record.text;
    saveToHistory(record.text);

    if (record.voiceConfig) {
      currentVoice.value = record.voiceConfig;
      audioConfig.value.voice_id = record.voiceConfig.id;
    }
    if (record.audioConfig) {
      audioConfig.value = { ...audioConfig.value, ...record.audioConfig };
    }
    if (record.bgmConfig) {
      audioConfig.value = {
        ...audioConfig.value,
        bgmPath: record.bgmConfig.path ?? null,
        bgmVolume: record.bgmConfig.volume,
      };
    }
    if (record.assetSnapshot) {
      localStorage.setItem(CUSTOM_SOUND_KEY, JSON.stringify(record.assetSnapshot.soundEffects || []));
      localStorage.setItem(CUSTOM_BGM_KEY, JSON.stringify(record.assetSnapshot.bgmTracks || []));
      document.dispatchEvent(new CustomEvent('media-assets-updated'));
    }

    syncWebAudioConfig(audioConfig.value);
  }

  loadHistoryRecords();
  if (history.value.length === 0) {
    saveToHistory('');
  }

  return {
    text,
    history,
    historyIndex,
    maxLength,
    currentVoice,
    audioConfig,
    isPlaying,
    previewState,
    previewProgress,
    isGenerating,
    generationProgress,
    showHistoryPanel,
    showImportDialog,
    showVoiceSelector,
    pendingVoiceWrap,
    pendingVoiceEdit,
    historyRecords,
    editorSelection,
    charCount,
    canUndo,
    canRedo,
    setText,
    setTextWithoutHistory,
    setEditorSelection,
    clearLastExpandedSelection,
    addToHistory,
    undo,
    redo,
    clearText,
    clearFormatOnly,
    setCurrentVoice,
    setAudioConfig,
    setPlaying,
    setPreviewState,
    setPreviewProgress,
    resetPreview,
    setGenerating,
    setProgress,
    toggleHistoryPanel,
    toggleImportDialog,
    toggleVoiceSelector,
    openVoiceSelector,
    openVoiceWrapSelector,
    openVoiceEditSelector,
    closeVoiceSelector,
    consumePendingVoiceWrap,
    consumePendingVoiceEdit,
    restoreHistoryEntry,
    saveHistoryBackupRecord,
    deleteHistoryBackupRecord,
    clearHistoryBackupRecords,
    loadHistoryBackupRecord,
  };
});





