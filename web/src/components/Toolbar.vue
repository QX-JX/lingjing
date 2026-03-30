<template>
  <div ref="toolbarShellRef" class="toolbar-shell">
    <input ref="soundInputRef" type="file" accept=".mp3,audio/mpeg" class="hidden-input" @change="handleSoundUpload" />
    <input ref="bgmInputRef" type="file" accept=".mp3,audio/mpeg" class="hidden-input" @change="handleBgmUpload" />

    <div class="toolbar" @click.stop>
      <template v-for="(item, index) in items" :key="item.key">
        <div v-if="item.separator && index !== 0" class="tool-separator"></div>
        <button
          :ref="setToolRef(item.key)"
          type="button"
          class="tool-item"
          :class="{
            'tool-item--disabled': item.disabled,
            'tool-item--active': item.panel && activePanel === item.panel,
          }"
          :disabled="item.disabled"
          :title="item.disabled && item.disabledReason ? item.disabledReason : item.label"
          @mousedown.prevent
          @click.stop="item.action"
        >
          <span class="tool-icon">{{ item.icon }}</span>
          <span class="tool-label">{{ item.label }}</span>
        </button>
      </template>
    </div>

    <teleport to="body">
      <div v-if="activePanel" ref="panelLayerRef" class="panel-layer" :style="panelStyle" @click.stop>
      <div v-if="activePanel === 'pause'" class="panel-card panel-card--small">
        <button
          v-for="option in pauseOptions"
          :key="option.value"
          type="button"
          class="panel-option"
          @click="insertPause(option.value)"
        >
          {{ t('toolbar.insertPause') }} {{ option.label }}
        </button>
      </div>

      <div v-else-if="activePanel === 'speed'" class="panel-card panel-card--small">
        <button
          v-for="option in speedOptions"
          :key="option.value"
          type="button"
          class="panel-option"
          @click="setSpeed(option.value)"
        >
          {{ t('voice.speed') }} {{ option.label }}
        </button>
      </div>

      <div v-else-if="activePanel === 'number'" class="panel-card panel-card--small">
        <button type="button" class="panel-option" @click="setNumberMode('digits')">{{ t('numberReading.digits') }}</button>
        <button type="button" class="panel-option" @click="setNumberMode('cardinal')">{{ t('numberReading.cardinal') }}</button>
        <button type="button" class="panel-option" @click="setNumberMode('telephone')">{{ t('numberReading.telephone') }}</button>
      </div>

      <div v-else-if="activePanel === 'polyphone'" class="panel-card panel-card--polyphone">
        <template v-if="polyphonePanelData">
          <div class="polyphone-panel-title">{{ t('polyphone.pronunciation', { char: polyphonePanelData.char }) }}</div>
          <button
            v-for="option in polyphonePanelData.options"
            :key="option"
            type="button"
            class="panel-option panel-option--polyphone"
            :class="{ 'panel-option--active': option === polyphonePanelData.currentPronunciation }"
            @click="applyPolyphoneFromToolbar(option)"
          >
            <span>{{ getToneMark(option) }}</span>
            <span class="panel-option-meta">{{ option }}</span>
          </button>
        </template>
        <div v-else class="polyphone-panel-empty">{{ t('toast.selectChar') }}</div>
      </div>

      <div v-else-if="activePanel === 'clear'" class="panel-card panel-card--small">
        <button type="button" class="panel-option" @click="clearAllContent">{{ t('clear.clearAll') }}</button>
        <button type="button" class="panel-option" @click="clearFormatOnly">{{ t('clear.clearFormatOnly') }}</button>
      </div>

      <div v-else-if="activePanel === 'effect'" class="panel-card panel-card--effect">
        <div class="sound-panel-header">
          <span class="sound-panel-header__title">{{ t('soundEffect.title') }}</span>
          <button type="button" class="sound-panel-header__close" @click="closeAllPanels">×</button>
        </div>

        <div class="bgm-tabs">
          <button
            type="button"
            class="bgm-tab"
            :class="{ 'bgm-tab--active': activeSoundTab === 'list' }"
            @click="activeSoundTab = 'list'"
          >
            {{ t('soundEffect.musicList') }}
          </button>
          <button
            type="button"
            class="bgm-tab"
            :class="{ 'bgm-tab--active': activeSoundTab === 'import' }"
            @click="activeSoundTab = 'import'"
          >
            {{ t('soundEffect.localImport') }}
          </button>
        </div>

        <div v-if="activeSoundTab === 'list'" class="sound-panel">
          <div class="sound-search">
            <span class="sound-search__icon">⌕</span>
            <input
              v-model="soundSearchQuery"
              type="text"
              class="sound-search__input"
              :placeholder="t('soundEffect.searchPlaceholder')"
            />
          </div>

          <div class="sound-category-list">
            <button
              v-for="category in soundCategories"
              :key="category"
              type="button"
              class="sound-category-tag"
              :class="{ 'sound-category-tag--active': selectedSoundCategory === category }"
              @click="selectedSoundCategory = category"
            >
              {{ getSoundCategoryLabel(category) }}({{ getSoundCategoryCount(category) }})
            </button>
          </div>

          <div v-if="filteredSoundEffects.length > 0" class="sound-grid">
            <button
              v-for="effect in filteredSoundEffects"
              :key="effect.id"
              type="button"
              class="sound-grid-item"
              @click="insertSoundEffect(effect.id)"
            >
              <span
                class="sound-grid-item__play"
                :class="{ 'sound-grid-item__play--active': soundPreviewId === effect.id }"
                @click.stop="toggleSoundPreview(effect)"
              >
                {{ soundPreviewId === effect.id ? '||' : '▶' }}
              </span>
              <span class="sound-grid-item__name">{{ effect.label }}</span>
              <span class="sound-grid-item__duration">{{ formatBgmDuration(effect.duration) }}</span>
              <span
                class="sound-grid-item__favorite"
                :class="{ 'sound-grid-item__favorite--active': favoriteSoundIds.has(effect.id) }"
                @click.stop="toggleSoundFavorite(effect.id)"
              >
                {{ favoriteSoundIds.has(effect.id) ? '♥' : '♡' }}
              </span>
            </button>
          </div>

          <div v-else class="sound-empty">
            {{ soundSearchQuery.trim() ? t('soundEffect.noResults') : t('soundEffect.noEffects') }}
          </div>
        </div>

        <div v-else class="sound-import-tab">
          <button type="button" class="bgm-upload-box" :disabled="isUploadingSound" @click="triggerSoundUpload">
            <span class="bgm-upload-icon">↑</span>
            <span class="bgm-upload-title">
              {{ isUploadingSound ? t('soundEffect.uploading') : t('soundEffect.uploadFromLocal') }}
            </span>
            <span class="bgm-upload-hint">{{ t('soundEffect.uploadHint') }}</span>
          </button>

          <div class="sound-import-stats">
            {{ t('soundEffect.totalEffects', { count: customSoundEffects.length }) }}
          </div>

          <div v-if="customSoundEffects.length > 0" class="bgm-custom-list">
            <button
              v-for="effect in customSoundEffects"
              :key="`custom-${effect.id}`"
              type="button"
              class="bgm-item"
              @click="insertSoundEffect(effect.id)"
            >
              <span class="bgm-play" @click.stop="toggleSoundPreview(effect)">
                {{ soundPreviewId === effect.id ? '||' : '>' }}
              </span>
              <span class="bgm-info">
                <span class="bgm-name">{{ effect.name }}</span>
                <span class="bgm-duration">{{ formatBgmDuration(effect.duration || 0) }}</span>
              </span>
              <span class="option-delete" @click.stop="removeCustomSound(effect.id)">{{ t('soundEffect.delete') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activePanel === 'bgm'" class="panel-card panel-card--bgm">
        <div class="bgm-tabs">
          <button
            type="button"
            class="bgm-tab"
            :class="{ 'bgm-tab--active': activeBgmTab === 'list' }"
            @click="activeBgmTab = 'list'"
          >
            {{ t('backgroundMusic.musicList') }}
          </button>
          <button
            type="button"
            class="bgm-tab"
            :class="{ 'bgm-tab--active': activeBgmTab === 'import' }"
            @click="activeBgmTab = 'import'"
          >
            {{ t('backgroundMusic.localImport') }}
          </button>
        </div>

        <div v-if="activeBgmTab === 'list'" class="bgm-list">
          <button
            v-for="track in bgmTracks"
            :key="track.id"
            type="button"
            class="bgm-item"
            :class="{ 'bgm-item--active': isSelectedBgm(track.value) }"
            @click="selectBackgroundMusic(track.value)"
          >
            <span class="bgm-play" @click.stop="toggleBgmPreview(track)">
              {{ bgmPreviewId === track.id ? '||' : '>' }}
            </span>
            <span class="bgm-info">
              <span class="bgm-name">{{ track.label }}</span>
              <span class="bgm-duration">{{ formatBgmDuration(track.duration) }}</span>
            </span>
            <span v-if="isSelectedBgm(track.value)" class="bgm-check">✓</span>
          </button>

          <div v-if="showBgmVolume" class="bgm-volume">
            <span class="bgm-volume-label">{{ t('backgroundMusic.volume') }}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="appStore.audioConfig.bgmVolume ?? 0.3"
              class="bgm-volume-slider"
              @input="handleBgmVolumeInput"
            />
            <span class="bgm-volume-value">{{ Math.round((appStore.audioConfig.bgmVolume ?? 0.3) * 100) }}%</span>
          </div>
        </div>

        <div v-else class="bgm-upload-tab">
          <button type="button" class="bgm-upload-box" :disabled="isUploadingBgm" @click="triggerBgmUpload">
            <span class="bgm-upload-icon">↑</span>
            <span class="bgm-upload-title">
              {{ isUploadingBgm ? t('soundEffect.uploading') : t('backgroundMusic.uploadLocalMusic') }}
            </span>
            <span class="bgm-upload-hint">{{ t('backgroundMusic.supportFormat') }}</span>
          </button>

          <div v-if="customBgmTracks.length > 0" class="bgm-custom-list">
            <button
              v-for="track in customBgmTracks"
              :key="`custom-bgm-${track.id}`"
              type="button"
              class="bgm-item"
              :class="{ 'bgm-item--active': isSelectedBgm(track.url) }"
              @click="selectBackgroundMusic(track.url)"
            >
              <span class="bgm-play" @click.stop="toggleBgmPreview(track)">
                {{ bgmPreviewId === track.id ? '||' : '>' }}
              </span>
              <span class="bgm-info">
                <span class="bgm-name">{{ track.name }}</span>
                <span class="bgm-duration">{{ formatBgmDuration(track.duration || 0) }}</span>
              </span>
              <span class="option-delete" @click.stop="removeCustomBgm(track.name)">{{ t('soundEffect.delete') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activePanel === 'settings'" class="panel-card">
        <button type="button" class="panel-option" @click="openVoicePanel">{{ t('voice.selectVoice') }}</button>
        <button type="button" class="panel-option" @click="openHistoryPanel">{{ t('history.title') }}</button>
        <button type="button" class="panel-option" @click="resetAudioConfig">{{ t('header.restore') }}</button>
        <button type="button" class="panel-option panel-option--danger" @click="clearBackgroundMusic">
          {{ t('backgroundMusic.remove') }}
        </button>
      </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCuratedVoiceById } from '../config/voiceCatalog';
import { useAppStore } from '../stores/appStore';
import { getPolyphoneOptions, getToneMark, isChineseChar } from '../utils/textWorkflow';
import {
  deleteBackgroundMusicAsset,
  deleteSoundEffectAsset,
  MAX_BGM_FILE_SIZE,
  MAX_SOUND_FILE_SIZE,
  type UploadedAsset,
  uploadBackgroundMusicAsset,
  uploadSoundEffectAsset,
} from '../services/mediaAssetService';

type ToolbarPanel = 'pause' | 'speed' | 'number' | 'polyphone' | 'effect' | 'bgm' | 'settings' | 'clear' | null;
type BgmTab = 'list' | 'import';
type SoundTab = 'list' | 'import';
type SoundCategory = 'all' | 'human' | 'environment' | 'prompt' | 'favorites';

interface BgmTrackOption {
  id: string;
  label: string;
  value: string | null;
  duration: number;
}

interface SoundEffectOption {
  id: string;
  label: string;
  category: Exclude<SoundCategory, 'all' | 'favorites'>;
  duration: number;
  src: string;
  isCustom?: boolean;
  name?: string;
}

interface ToolbarPolyphoneData {
  start: number;
  end: number;
  char: string;
  options: string[];
  currentPronunciation?: string;
}

const appStore = useAppStore();
const { t } = useI18n();
const activePanel = ref<ToolbarPanel>(null);
const activeBgmTab = ref<BgmTab>('list');
const activeSoundTab = ref<SoundTab>('list');
const soundInputRef = ref<HTMLInputElement | null>(null);
const bgmInputRef = ref<HTMLInputElement | null>(null);
const toolbarShellRef = ref<HTMLDivElement | null>(null);
const panelLayerRef = ref<HTMLDivElement | null>(null);
const customSoundEffects = ref<UploadedAsset[]>([]);
const customBgmTracks = ref<UploadedAsset[]>([]);
const isUploadingSound = ref(false);
const isUploadingBgm = ref(false);
const bgmPreviewAudio = ref<HTMLAudioElement | null>(null);
const bgmPreviewId = ref<string | null>(null);
const soundPreviewAudio = ref<HTMLAudioElement | null>(null);
const soundPreviewId = ref<string | null>(null);
const toolRefs = new Map<string, HTMLElement>();
const PANEL_WIDTHS: Record<Exclude<ToolbarPanel, null>, number> = {
  pause: 152,
  speed: 152,
  number: 152,
  polyphone: 248,
  clear: 152,
  settings: 180,
  bgm: 320,
  effect: 490,
};
const CUSTOM_SOUND_KEY = 'lingjing_custom_sound_effects';
const CUSTOM_BGM_KEY = 'lingjing_custom_bgm_tracks';
const SOUND_FAVORITES_KEY = 'lingjing_sound_effect_favorites';
const soundSearchQuery = ref('');
const selectedSoundCategory = ref<SoundCategory>('all');
const favoriteSoundIds = ref<Set<string>>(new Set());
const polyphonePanelData = ref<ToolbarPolyphoneData | null>(null);

const pauseOptions = [
  { label: '0.1s', value: 100 },
  { label: '0.2s', value: 200 },
  { label: '0.3s', value: 300 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
];

const speedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '0.8x', value: 0.8 },
  { label: '1.0x', value: 1.0 },
  { label: '1.2x', value: 1.2 },
  { label: '1.5x', value: 1.5 },
  { label: '2.0x', value: 2.0 },
];

const builtinSoundEffects = computed<SoundEffectOption[]>(() => [
  { id: 'applause', label: t('soundEffect.presets.applause'), category: 'human', duration: 2, src: '/sounds/effects/applause.mp3' },
  { id: 'laugh', label: t('soundEffect.presets.laugh'), category: 'human', duration: 1.5, src: '/sounds/effects/laugh.mp3' },
  { id: 'gasp', label: t('soundEffect.presets.gasp'), category: 'human', duration: 0.5, src: '/sounds/effects/gasp.mp3' },
  { id: 'doorbell', label: t('soundEffect.presets.doorbell'), category: 'environment', duration: 1, src: '/sounds/effects/doorbell.mp3' },
  { id: 'phone-ring', label: t('soundEffect.presets.ring'), category: 'environment', duration: 2, src: '/sounds/effects/phone-ring.mp3' },
  { id: 'knock', label: t('soundEffect.presets.knock'), category: 'environment', duration: 1, src: '/sounds/effects/knock.mp3' },
  { id: 'notification', label: t('soundEffect.presets.notification'), category: 'prompt', duration: 0.5, src: '/sounds/effects/notification.mp3' },
  { id: 'success', label: t('soundEffect.presets.success'), category: 'prompt', duration: 1, src: '/sounds/effects/success.mp3' },
  { id: 'warning', label: t('soundEffect.presets.warning'), category: 'prompt', duration: 1, src: '/sounds/effects/warning.mp3' },
]);

const soundCategories: SoundCategory[] = ['all', 'human', 'environment', 'prompt', 'favorites'];

const allSoundEffects = computed<SoundEffectOption[]>(() => [
  ...builtinSoundEffects.value,
  ...customSoundEffects.value.map((effect) => ({
    id: effect.id,
    label: effect.name,
    name: effect.name,
    category: 'environment' as const,
    duration: effect.duration || 0,
    src: effect.url,
    isCustom: true,
  })),
]);

const filteredSoundEffects = computed(() => {
  const keyword = soundSearchQuery.value.trim().toLowerCase();
  return allSoundEffects.value.filter((effect) => {
    const matchesKeyword = !keyword || effect.label.toLowerCase().includes(keyword) || effect.id.toLowerCase().includes(keyword);
    if (!matchesKeyword) return false;
    if (selectedSoundCategory.value === 'all') return true;
    if (selectedSoundCategory.value === 'favorites') return favoriteSoundIds.value.has(effect.id);
    return effect.category === selectedSoundCategory.value;
  });
});

const bgmTracks = computed<BgmTrackOption[]>(() => [
  { id: 'none', label: t('backgroundMusic.noBgm'), value: null, duration: 0 },
  { id: 'light-rhythm', label: t('backgroundMusic.presets.lightRhythm'), value: '/sounds/bgm/upbeat.mp3', duration: 165 },
  { id: 'finding-myself', label: t('backgroundMusic.presets.findingMyself'), value: '/sounds/bgm/finding-myself.mp3', duration: 182 },
  { id: 'forest-walk', label: t('backgroundMusic.presets.forestWalk'), value: '/sounds/bgm/forest-walk.mp3', duration: 215 },
  { id: 'silent-descent', label: t('backgroundMusic.presets.silentDescent'), value: '/sounds/bgm/silent-descent.mp3', duration: 198 },
  { id: 'smile', label: t('backgroundMusic.presets.smile'), value: '/sounds/bgm/smile.mp3', duration: 145 },
  { id: 'tears-of-joy', label: t('backgroundMusic.presets.tearsOfJoy'), value: '/sounds/bgm/tears-of-joy.mp3', duration: 176 },
  { id: 'valley-sunset', label: t('backgroundMusic.presets.valleySunset'), value: '/sounds/bgm/valley-sunset.mp3', duration: 204 },
]);

const showBgmVolume = computed(() => Boolean(appStore.audioConfig.bgmPath));

const setToolRef = (key: string) => (el: Element | null) => {
  if (el instanceof HTMLElement) {
    toolRefs.set(key, el);
  } else {
    toolRefs.delete(key);
  }
};

const panelStyle = computed(() => {
  const panelKey = activePanel.value ? items.value.find((item) => item.panel === activePanel.value)?.key : null;
  const panelButton = panelKey ? toolRefs.get(panelKey) : null;
  const panelWidth = activePanel.value ? PANEL_WIDTHS[activePanel.value] : 180;

  if (!panelButton) {
    return {
      left: '24px',
      top: '96px',
    };
  }

  const shellRect = toolbarShellRef.value?.getBoundingClientRect();
  const buttonRect = panelButton.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const minLeft = 12;
  const maxLeft = Math.max(minLeft, viewportWidth - panelWidth - 12);

  let nextLeft = buttonRect.left + (buttonRect.width - panelWidth) / 2;

  if (buttonRect.left + panelWidth > viewportWidth - 12) {
    nextLeft = buttonRect.right - panelWidth;
  }

  nextLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);

  return {
    left: `${Math.round(nextLeft)}px`,
    top: `${Math.round((shellRect?.bottom ?? buttonRect.bottom) + 10)}px`,
  };
});

const dispatchEditorCommand = (detail: unknown) => {
  document.dispatchEvent(new CustomEvent('voice-editor-command', { detail }));
};

const stopBgmPreview = () => {
  if (!bgmPreviewAudio.value) return;
  bgmPreviewAudio.value.pause();
  bgmPreviewAudio.value.currentTime = 0;
  bgmPreviewAudio.value = null;
  bgmPreviewId.value = null;
};

const stopSoundPreview = () => {
  if (!soundPreviewAudio.value) return;
  soundPreviewAudio.value.pause();
  soundPreviewAudio.value.currentTime = 0;
  soundPreviewAudio.value = null;
  soundPreviewId.value = null;
};

const closeAllPanels = () => {
  activePanel.value = null;
  polyphonePanelData.value = null;
  stopBgmPreview();
  stopSoundPreview();
};

const togglePanel = (panel: Exclude<ToolbarPanel, null>) => {
  if (activePanel.value === panel) {
    closeAllPanels();
    return;
  }

  activePanel.value = panel;
  if (panel === 'bgm') {
    activeBgmTab.value = 'list';
    stopSoundPreview();
  } else if (panel === 'effect') {
    activeSoundTab.value = 'list';
    soundSearchQuery.value = '';
    selectedSoundCategory.value = 'all';
    stopBgmPreview();
  } else {
    stopBgmPreview();
    stopSoundPreview();
  }
};

const copyText = async () => {
  if (!appStore.text) return;
  try {
    await navigator.clipboard.writeText(appStore.text);
  } catch (error) {
    console.error('copy failed', error);
  }
};

const insertPause = (ms: number) => {
  dispatchEditorCommand({ type: 'insertPause', ms });
  closeAllPanels();
};

const setSpeed = (speed: number) => {
  dispatchEditorCommand({ type: 'wrapSpeed', rate: speed });
  closeAllPanels();
};

const setNumberMode = (mode: string) => {
  dispatchEditorCommand({ type: 'wrapNumber', mode });
  closeAllPanels();
};

const applyPolyphoneFromToolbar = (pronunciation: string) => {
  if (!polyphonePanelData.value) return;
  dispatchEditorCommand({
    type: 'applyPolyphoneFromToolbar',
    start: polyphonePanelData.value.start,
    end: polyphonePanelData.value.end,
    char: polyphonePanelData.value.char,
    pronunciation,
  });
  closeAllPanels();
};

const handleNumberReadingClick = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    window.alert(t('toast.selectNumber'));
    closeAllPanels();
    return;
  }
  togglePanel('number');
};

const handleReread = () => {
  dispatchEditorCommand({ type: 'wrapReread' });
};

const handleMultiVoice = () => {
  dispatchEditorCommand({ type: 'requestVoiceWrap' });
};

const handlePolyphonic = () => {
  const currentSelection = appStore.editorSelection;
  const start =
    currentSelection.end > currentSelection.start
      ? currentSelection.start
      : currentSelection.lastExpandedStart;
  const end =
    currentSelection.end > currentSelection.start
      ? currentSelection.end
      : currentSelection.lastExpandedEnd;

  if (start === null || end === null || start === end) {
    window.alert(t('toast.selectChar'));
    closeAllPanels();
    return;
  }

  if (end - start !== 1) {
    window.alert(t('toast.singleCharOnly'));
    closeAllPanels();
    return;
  }

  const selected = appStore.text.slice(start, end);
  if (!isChineseChar(selected)) {
    window.alert(t('toast.selectChineseChar'));
    closeAllPanels();
    return;
  }

  const options = getPolyphoneOptions(selected);
  if (options.length <= 1) {
    window.alert(t('toast.notPolyphone'));
    closeAllPanels();
    return;
  }

  polyphonePanelData.value = {
    start,
    end,
    char: selected,
    options,
  };
  activePanel.value = 'polyphone';
};

const insertSoundEffect = (effect: string) => {
  dispatchEditorCommand({ type: 'insertSoundEffect', effect });
  closeAllPanels();
};

const getSoundCategoryLabel = (category: SoundCategory) => {
  return t(`soundEffect.categories.${category}`);
};

const getSoundCategoryCount = (category: SoundCategory) => {
  if (category === 'all') return allSoundEffects.value.length;
  if (category === 'favorites') return allSoundEffects.value.filter((effect) => favoriteSoundIds.value.has(effect.id)).length;
  return allSoundEffects.value.filter((effect) => effect.category === category).length;
};

const toggleSoundFavorite = (id: string) => {
  const next = new Set(favoriteSoundIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  favoriteSoundIds.value = next;
  localStorage.setItem(SOUND_FAVORITES_KEY, JSON.stringify(Array.from(next)));
};

const selectBackgroundMusic = (track: string | null) => {
  appStore.setAudioConfig({ bgmPath: track });
};

const clearBackgroundMusic = () => {
  stopBgmPreview();
  appStore.setAudioConfig({ bgmPath: null });
};

const isSelectedBgm = (value: string | null) => appStore.audioConfig.bgmPath === value;

const triggerSoundUpload = () => {
  activeSoundTab.value = 'import';
  soundInputRef.value?.click();
};

const triggerBgmUpload = () => {
  activeBgmTab.value = 'import';
  bgmInputRef.value?.click();
};

const saveCustomLists = () => {
  localStorage.setItem(CUSTOM_SOUND_KEY, JSON.stringify(customSoundEffects.value));
  localStorage.setItem(CUSTOM_BGM_KEY, JSON.stringify(customBgmTracks.value));
};

const loadCustomLists = () => {
  try {
    customSoundEffects.value = JSON.parse(localStorage.getItem(CUSTOM_SOUND_KEY) || '[]') as UploadedAsset[];
    customBgmTracks.value = JSON.parse(localStorage.getItem(CUSTOM_BGM_KEY) || '[]') as UploadedAsset[];
    favoriteSoundIds.value = new Set(JSON.parse(localStorage.getItem(SOUND_FAVORITES_KEY) || '[]') as string[]);
  } catch {
    customSoundEffects.value = [];
    customBgmTracks.value = [];
    favoriteSoundIds.value = new Set();
  }
};

const formatAssetMeta = (asset: UploadedAsset) => {
  const kb = Math.max(1, Math.round(asset.size / 1024));
  const duration = asset.duration ? `${asset.duration.toFixed(1)}s` : t('history.unnamed');
  return `${asset.name}\n${kb}KB | ${duration}`;
};

const formatBgmDuration = (seconds: number) => {
  if (!seconds) return '0';
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const toggleSoundPreview = async (effect: SoundEffectOption | UploadedAsset) => {
  const id = 'src' in effect ? effect.id : effect.id;
  const src = 'src' in effect ? effect.src : effect.url;
  if (!src) {
    stopSoundPreview();
    return;
  }

  if (soundPreviewId.value === id) {
    stopSoundPreview();
    return;
  }

  stopSoundPreview();
  const audio = new Audio(src);
  audio.volume = 0.7;
  audio.onended = () => {
    soundPreviewAudio.value = null;
    soundPreviewId.value = null;
  };

  try {
    await audio.play();
    soundPreviewAudio.value = audio;
    soundPreviewId.value = id;
  } catch (error) {
    console.error('sound preview failed', error);
  }
};

const resolveBgmTrack = (track: BgmTrackOption | UploadedAsset) => {
  if ('value' in track) {
    return { id: track.id, src: track.value, volume: appStore.audioConfig.bgmVolume ?? 0.3 };
  }
  return { id: track.id, src: track.url, volume: appStore.audioConfig.bgmVolume ?? 0.3 };
};

const toggleBgmPreview = async (track: BgmTrackOption | UploadedAsset) => {
  const resolved = resolveBgmTrack(track);

  if (!resolved.src) {
    stopBgmPreview();
    return;
  }

  if (bgmPreviewId.value === resolved.id) {
    stopBgmPreview();
    return;
  }

  stopBgmPreview();

  const audio = new Audio(resolved.src);
  audio.volume = resolved.volume;
  audio.onended = () => {
    bgmPreviewAudio.value = null;
    bgmPreviewId.value = null;
  };

  try {
    await audio.play();
    bgmPreviewAudio.value = audio;
    bgmPreviewId.value = resolved.id;
  } catch (error) {
    console.error('bgm preview failed', error);
  }
};

const handleBgmVolumeInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value);
  appStore.setAudioConfig({ bgmVolume: value });
  if (bgmPreviewAudio.value) {
    bgmPreviewAudio.value.volume = value;
  }
};

const handleSoundUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.mp3')) {
    window.alert(t('backgroundMusic.selectMp3'));
    return;
  }
  if (file.size > MAX_SOUND_FILE_SIZE) {
    window.alert(t('import.fileTooLarge'));
    return;
  }
  try {
    isUploadingSound.value = true;
    const uploaded = await uploadSoundEffectAsset(file);
    if (!customSoundEffects.value.some((item) => item.id === uploaded.id || item.name === uploaded.name)) {
      customSoundEffects.value.push(uploaded);
      saveCustomLists();
    }
  } catch (error) {
    window.alert(t('backgroundMusic.uploadFailed', { error: (error as Error).message }));
  } finally {
    isUploadingSound.value = false;
  }
  (event.target as HTMLInputElement).value = '';
};

const handleBgmUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.mp3')) {
    window.alert(t('backgroundMusic.selectMp3'));
    return;
  }
  if (file.size > MAX_BGM_FILE_SIZE) {
    window.alert(t('backgroundMusic.fileTooLarge'));
    return;
  }
  try {
    isUploadingBgm.value = true;
    const uploaded = await uploadBackgroundMusicAsset(file);
    if (!customBgmTracks.value.some((item) => item.name === uploaded.name)) {
      customBgmTracks.value.push(uploaded);
      saveCustomLists();
    }
    appStore.setAudioConfig({ bgmPath: uploaded.url });
  } catch (error) {
    window.alert(t('backgroundMusic.uploadFailed', { error: (error as Error).message }));
  } finally {
    isUploadingBgm.value = false;
  }
  (event.target as HTMLInputElement).value = '';
};

const removeCustomSound = async (effectId: string) => {
  const target = customSoundEffects.value.find((item) => item.id === effectId);
  if (target) {
    await deleteSoundEffectAsset(target);
  }
  customSoundEffects.value = customSoundEffects.value.filter((item) => item.id !== effectId);
  const nextFavorites = new Set(favoriteSoundIds.value);
  nextFavorites.delete(effectId);
  favoriteSoundIds.value = nextFavorites;
  localStorage.setItem(SOUND_FAVORITES_KEY, JSON.stringify(Array.from(nextFavorites)));
  if (soundPreviewId.value === target?.id) {
    stopSoundPreview();
  }
  saveCustomLists();
};

const removeCustomBgm = async (track: string) => {
  const target = customBgmTracks.value.find((item) => item.name === track);
  if (target) {
    await deleteBackgroundMusicAsset(target);
  }
  customBgmTracks.value = customBgmTracks.value.filter((item) => item.name !== track);
  if (appStore.audioConfig.bgmPath === target?.url) {
    appStore.setAudioConfig({ bgmPath: null });
  }
  if (bgmPreviewId.value === target?.id) {
    stopBgmPreview();
  }
  saveCustomLists();
};

const resetAudioConfig = () => {
  const defaultVoice = getCuratedVoiceById('zhiwei');
  stopBgmPreview();
  document.dispatchEvent(new CustomEvent('status-bar-stop-preview'));
  appStore.setCurrentVoice({
    id: defaultVoice.id,
    name: defaultVoice.name,
    gender: defaultVoice.gender,
    language: defaultVoice.language,
    description: defaultVoice.description,
  });
  appStore.setAudioConfig({
    voice_id: defaultVoice.id,
    speed: 1,
    pitch: 1,
    volume: 1,
    bgmPath: null,
    bgmVolume: 0.3,
  });
  closeAllPanels();
};

const openHistoryPanel = () => {
  closeAllPanels();
  if (!appStore.showHistoryPanel) appStore.toggleHistoryPanel();
};

const openVoicePanel = () => {
  closeAllPanels();
  appStore.openVoiceSelector();
};

const handleImport = () => {
  closeAllPanels();
  if (!appStore.showImportDialog) appStore.toggleImportDialog();
};

const clearAllContent = () => {
  appStore.clearText();
  closeAllPanels();
};

const clearFormatOnly = () => {
  const plainText = appStore.clearFormatOnly();
  if (!plainText) {
    window.alert(t('toast.noContentToKeep'));
  }
  closeAllPanels();
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null;
  const isInsideToolbar = toolbarShellRef.value?.contains(target);
  const isInsidePanel = panelLayerRef.value?.contains(target);
  if (!isInsideToolbar && !isInsidePanel) {
    closeAllPanels();
  }
};

const hasEditorContent = computed(() => appStore.text.length > 0);

const items = computed(() => [
  { key: 'undo', icon: '<-', label: t('toolbar.undo'), action: () => appStore.undo(), disabled: !appStore.canUndo, disabledReason: t('toast.noContentToKeep'), separator: false, panel: null },
  { key: 'redo', icon: '->', label: t('toolbar.redo'), action: () => appStore.redo(), disabled: !appStore.canRedo, disabledReason: t('toast.noContentToKeep'), separator: false, panel: null },
  { key: 'clear', icon: '[]', label: t('toolbar.clear'), action: () => togglePanel('clear'), disabled: !hasEditorContent.value, disabledReason: t('toast.noContentToKeep'), separator: false, panel: 'clear' },
  { key: 'copy', icon: 'cp', label: t('toolbar.copy'), action: copyText, disabled: !hasEditorContent.value, disabledReason: t('toast.noContentToKeep'), separator: true, panel: null },
  { key: 'pause', icon: '||', label: t('toolbar.insertPause'), action: () => togglePanel('pause'), disabled: false, separator: false, panel: 'pause' },
  { key: 'speed', icon: '~', label: t('toolbar.speedChange'), action: () => togglePanel('speed'), disabled: false, separator: true, panel: 'speed' },
  { key: 'reread', icon: 'o', label: t('toolbar.reread'), action: handleReread, disabled: false, separator: false, panel: null },
  { key: 'number', icon: '#', label: t('toolbar.numericReading'), action: handleNumberReadingClick, disabled: false, separator: false, panel: 'number' },
  { key: 'voice', icon: 'vv', label: t('toolbar.multipleSpeakers'), action: handleMultiVoice, disabled: false, separator: false, panel: null },
  { key: 'polyphone', icon: 'T', label: t('toolbar.polyphonic'), action: handlePolyphonic, disabled: false, separator: false, panel: 'polyphone' },
  { key: 'effect', icon: 'fx', label: t('toolbar.specialEffects'), action: () => togglePanel('effect'), disabled: false, separator: true, panel: 'effect' },
  { key: 'bgm', icon: 'bg', label: t('toolbar.backgroundMusic'), action: () => togglePanel('bgm'), disabled: false, separator: false, panel: 'bgm' },
  { key: 'import', icon: 'in', label: t('toolbar.import'), action: handleImport, disabled: false, separator: true, panel: null },
  { key: 'history', icon: 'o', label: t('toolbar.historyBackup'), action: openHistoryPanel, disabled: false, separator: false, panel: null },
  { key: 'settings', icon: '*', label: t('header.settings'), action: () => togglePanel('settings'), disabled: false, separator: true, panel: 'settings' },
]);

onMounted(() => {
  loadCustomLists();
  document.addEventListener('media-assets-updated', loadCustomLists as EventListener);
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  stopBgmPreview();
  stopSoundPreview();
  document.removeEventListener('media-assets-updated', loadCustomLists as EventListener);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.toolbar-shell {
  position: relative;
  padding: 10px 16px 0;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.hidden-input {
  display: none;
}

.toolbar {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  padding: 6px 10px 5px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.tool-separator {
  width: 1px;
  margin: 14px 3px;
  background: #d4d8df;
  flex-shrink: 0;
}

.tool-item {
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  height: 84px;
  padding: 8px 8px 7px;
  border: none;
  background: transparent;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  color: #1e293b;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 12px;
  transition: background-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.tool-item:hover,
.tool-item--active {
  background: rgba(255, 255, 255, 0.88);
}

.tool-item--disabled {
  opacity: 0.32;
  color: #94a3b8;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 22px;
  line-height: 1;
}

.tool-label {
  font-size: 11px;
  line-height: 1.2;
  width: 100%;
  display: block;
  text-align: center;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  min-height: 26px;
}

.panel-layer {
  position: fixed;
  z-index: 60;
}

.panel-card {
  min-width: 180px;
  padding: 8px;
  display: grid;
  gap: 6px;
  background: #fff;
  border: 1px solid #f1d8c5;
  border-radius: 12px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.panel-card--small {
  min-width: 152px;
}

.panel-card--polyphone {
  width: 248px;
  padding: 10px;
}

.panel-card--bgm {
  width: 320px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 10px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
}

.panel-card--effect {
  width: 490px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e7eaf0;
  border-radius: 16px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.sound-panel-header {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #eceff4;
  background: #fff;
}

.sound-panel-header__title {
  color: #0f172a;
  font-size: 18px;
  font-weight: 600;
}

.sound-panel-header__close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #94a3b8;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.sound-panel-header__close:hover {
  background: #f1f5f9;
  color: #475569;
}

.panel-option {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #edf0f5;
  border-radius: 9px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sound-panel,
.sound-import-tab {
  padding: 14px 12px 12px;
}

.sound-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 38px;
  border: 1px solid #dbe2eb;
  border-radius: 12px;
  background: #fff;
}

.sound-search__icon {
  color: #94a3b8;
  font-size: 14px;
}

.sound-search__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #334155;
}

.sound-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.sound-category-tag {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: #f2f4f8;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
}

.sound-category-tag--active {
  background: #4a7cf4;
  color: #fff;
}

.sound-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
  margin-top: 14px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 2px;
}

.sound-grid-item {
  height: 44px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 38px 22px;
  align-items: center;
  gap: 10px;
  border: none;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  padding: 0 4px 0 2px;
}

.sound-grid-item:hover {
  background: #f8fafc;
}

.sound-grid-item__play {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #4a7cf4;
  color: #fff;
  font-size: 9px;
  box-shadow: 0 6px 14px rgba(74, 124, 244, 0.22);
}

.sound-grid-item__play--active {
  background: #315fcb;
}

.sound-grid-item__name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #334155;
  font-size: 14px;
}

.sound-grid-item__duration {
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.sound-grid-item__favorite {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1;
  text-align: center;
}

.sound-grid-item__favorite--active {
  color: #94a3b8;
}

.sound-empty,
.sound-import-stats {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.sound-empty {
  padding: 18px 0 10px;
  text-align: center;
}

.sound-import-stats {
  margin-top: 14px;
}

.panel-option:hover {
  border-color: #f7b58b;
  background: #fff7ef;
}

.panel-option--active {
  border-color: #f7b58b;
  background: #fff7ef;
  color: #c2410c;
}

.polyphone-panel-title {
  padding: 2px 4px 6px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.panel-option--polyphone {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-option-meta {
  color: #94a3b8;
  font-size: 12px;
}

.polyphone-panel-empty {
  padding: 8px 4px 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.panel-option--danger {
  color: #c2410c;
}

.panel-option--custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.option-main {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-delete {
  color: #dc2626;
  font-size: 12px;
  padding-left: 8px;
  flex-shrink: 0;
}

.bgm-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.bgm-tab {
  height: 42px;
  border: none;
  appearance: none;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.bgm-tab--active {
  color: #2563eb;
  box-shadow: inset 0 -2px 0 #2563eb;
}

.bgm-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  padding: 8px 6px 10px;
  overflow-y: auto;
}

.bgm-item,
.bgm-custom-list .bgm-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  appearance: none;
  background: #fff;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.bgm-item:hover {
  background: #f8fafc;
}

.bgm-item--active {
  background: #eef5ff;
  color: #2563eb;
}

.bgm-play {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
}

.bgm-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bgm-name {
  font-size: 14px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bgm-duration {
  font-size: 12px;
  color: #94a3b8;
}

.bgm-check {
  color: #2563eb;
  font-size: 16px;
  font-weight: 700;
}

.bgm-volume {
  margin-top: 6px;
  padding: 10px 12px 4px;
  border-top: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bgm-volume-label,
.bgm-volume-value {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.bgm-volume-slider {
  flex: 1;
}

.bgm-upload-tab {
  padding: 14px 12px;
}

.bgm-upload-box {
  width: 100%;
  min-height: 120px;
  border: 2px dashed #93c5fd;
  border-radius: 10px;
  background: #edf5ff;
  color: #93a4bd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  appearance: none;
}

.bgm-upload-title {
  font-size: 14px;
  color: #7c8faa;
}

.bgm-upload-hint {
  font-size: 12px;
  color: #90a4c1;
}

.bgm-upload-icon {
  font-size: 28px;
  line-height: 1;
  color: #9bbcf4;
}

.bgm-custom-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 150px;
  overflow-y: auto;
}
</style>







