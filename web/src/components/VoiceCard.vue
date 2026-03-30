<template>
  <div class="voice-card-shell">
    <div class="voice-card" @mouseenter="expanded = true" @mouseleave="expanded = false">
      <div class="voice-top" :class="{ 'voice-top--open': expanded }">
        <div class="voice-main" @click="openSelector">
          <div class="voice-avatar">
            <img :src="currentVoiceMeta.avatar" :alt="currentVoiceMeta.name" />
          </div>
          <div class="voice-name">{{ $t(`voices.${currentVoiceMeta.id}`) }}</div>
        </div>

        <button
          v-show="expanded"
          type="button"
          class="more-btn"
          @mousedown.stop.prevent
          @click.stop="handleMoreClick"
        >
          {{ $t('voice.more') }}
        </button>
      </div>

      <VoiceSettingsPanel v-if="expanded" />
    </div>

    <!-- Teleport锛氶伩鍏嶇埗绾?workspace-section 鐨?z-index 灞傚彔涓婁笅鏂囧鑷村脊绐楄椤靛ご鐩栦綇 -->
    <Teleport to="body">
      <div v-if="showSelector" class="voice-selector-overlay" @click.self="closeSelector">
        <div class="voice-selector-modal">
          <div class="modal-header">
            <h3 class="modal-title">{{ $t('voice.selectVoice') }}</h3>
            <button type="button" class="close-btn" @click="closeSelector">&times;</button>
          </div>

          <div class="modal-body">
            <div class="voice-list">
              <button
                v-for="voice in curatedVoices"
                :key="voice.id"
                type="button"
                class="voice-item"
                :class="{ active: pendingVoiceId === voice.id }"
                @click="selectVoice(voice)"
              >
                <img class="voice-item-avatar" :src="voice.avatar" :alt="$t(`voices.${voice.id}`)" />
                <span class="voice-item-content">
                  <span class="voice-item-name">{{ $t(`voices.${voice.id}`) }}</span>
                  <span class="voice-item-desc">{{ $t(`voices.description.${voice.id}`) }}</span>
                </span>
              </button>
            </div>

            <div class="voice-config">
              <div class="voice-config__title">{{ $t('voice.voiceSettings') }}</div>

              <div class="voice-config__row">
                <label class="voice-config__label">
                  {{ $t('voice.speed') }}: {{ previewDraft.speed.toFixed(1) }}x
                </label>
                <input
                  v-model.number="previewDraft.speed"
                  class="voice-config__slider"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                />
              </div>

              <div class="voice-config__row">
                <label class="voice-config__label">{{ $t('voice.pitch') }}</label>
                <div class="voice-config__pitch-row">
                  <input
                    v-model.number="pitchStep"
                    class="voice-config__slider"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                  />
                </div>
                <div class="voice-config__pitch-legend">
                  <span class="voice-config__edge">{{ $t('voice.low') }}</span>
                  <span class="voice-config__edge voice-config__edge--right">{{ $t('voice.high') }}</span>
                </div>
                <div class="voice-config__pitch-value">{{ pitchStep }}</div>
              </div>

              <div class="voice-config__row">
                <label class="voice-config__label">
                  {{ $t('voice.volume') }}: {{ Math.round(previewDraft.volume * 100) }}%
                </label>
                <input
                  v-model.number="previewDraft.volume"
                  class="voice-config__slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                />
              </div>

              <button type="button" class="voice-config__preview" @click="togglePreview">
                <svg class="voice-config__preview-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path v-if="!isPreviewing" d="M8 5v14l11-7z" />
                  <path v-else d="M6 6h4v12H6V6zm8 0h4v12h-4V6z" />
                </svg>
                {{ isPreviewing ? $t('voice.stopPreview') : $t('voice.preview') }}
              </button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="footer-btn footer-btn--ghost" @click="closeSelector">{{ $t('voice.cancel') }}</button>
            <button type="button" class="footer-btn footer-btn--primary" @click="confirmVoice">{{ $t('voice.apply') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { curatedVoices, getCuratedVoiceById, type CuratedVoice } from '../config/voiceCatalog';
import { useAppStore } from '../stores/appStore';
import { playPreview, stopPreview } from '../services/webTtsService';
import VoiceSettingsPanel from './VoiceSettingsPanel.vue';

const appStore = useAppStore();
const { t } = useI18n();
const expanded = ref(false);
const pendingVoiceId = ref('');

const previewDraft = ref({ speed: 1, pitch: 1, volume: 1 });
const isPreviewing = ref(false);

/** 鎵撳紑寮圭獥鏃剁殑鍙戦煶涓庡弬鏁帮紝鐢ㄤ簬鍙栨秷/鍏抽棴鏃舵仮澶嶏紙璇曞惉浼氫复鏃舵敼鍐欏叏灞€閰嶇疆锛?*/
const modalSnapshot = ref<{ voiceId: string; speed: number; pitch: number; volume: number } | null>(null);

const showSelector = computed(() => appStore.showVoiceSelector);

const currentVoiceMeta = computed(() => getCuratedVoiceById(appStore.currentVoice.id));

const pendingVoice = computed(
  () => curatedVoices.find((voice) => voice.id === pendingVoiceId.value) ?? currentVoiceMeta.value
);

const selectorTargetVoiceId = computed(() => appStore.pendingVoiceEdit?.voiceId ?? appStore.currentVoice.id);

const openSelector = () => {
  appStore.openVoiceSelector();
};

const handleMoreClick = () => {
  expanded.value = false;
  openSelector();
};

const closeSelector = (applied = false) => {
  stopPreview();
  isPreviewing.value = false;
  pendingVoiceId.value = currentVoiceMeta.value.id;

  if (!applied && modalSnapshot.value) {
    const snap = modalSnapshot.value;
    const v = getCuratedVoiceById(snap.voiceId);
    appStore.setCurrentVoice({
      id: v.id,
      name: v.name,
      gender: v.gender,
      language: v.language,
      description: v.description,
    });
    appStore.setAudioConfig({
      voice_id: snap.voiceId,
      speed: snap.speed,
      pitch: snap.pitch,
      volume: snap.volume,
    });
  }
  modalSnapshot.value = null;
  appStore.closeVoiceSelector();
};

const applyVoice = (voice: CuratedVoice) => {
  const pendingEdit = appStore.consumePendingVoiceEdit();
  const pendingWrap = appStore.consumePendingVoiceWrap();

  if (pendingEdit) {
    document.dispatchEvent(
      new CustomEvent('voice-editor-command', {
        detail: {
          type: 'updateVoiceMarker',
          start: pendingEdit.start,
          end: pendingEdit.end,
          voiceId: voice.id,
          voiceName: voice.name,
          voiceAvatar: voice.avatar,
        },
      })
    );
    return 'marker';
  }

  if (pendingWrap) {
    document.dispatchEvent(
      new CustomEvent('voice-editor-command', {
        detail: {
          type: 'wrapVoice',
          start: pendingWrap.start,
          end: pendingWrap.end,
          voiceId: voice.id,
          voiceName: voice.name,
          voiceAvatar: voice.avatar,
        },
      })
    );
    return 'wrap';
  }

  appStore.setCurrentVoice({
    id: voice.id,
    name: voice.name,
    gender: voice.gender,
    language: voice.language,
    description: voice.description,
  });

  appStore.setAudioConfig({
    speed: previewDraft.value.speed,
    pitch: previewDraft.value.pitch,
    volume: previewDraft.value.volume,
  });

  return 'global';
};

const selectVoice = (voice: CuratedVoice) => {
  if (isPreviewing.value) {
    stopPreview();
    isPreviewing.value = false;
  }
  pendingVoiceId.value = voice.id;
};

const confirmVoice = () => {
  const mode = applyVoice(pendingVoice.value);
  if (mode === 'global') {
    closeSelector(true);
    return;
  }
  closeSelector(false);
};

/** 闊宠皟婊戞潯 0鈥?0锛屽搴?Web Speech pitch 0.5鈥?.0锛堜笌妗岄潰绔竴鑷达級 */
const pitchStep = computed({
  get: () => Math.round(((previewDraft.value.pitch - 0.5) / 1.5) * 10),
  set: (n: number) => {
    previewDraft.value = {
      ...previewDraft.value,
      pitch: 0.5 + (n / 10) * 1.5,
    };
  },
});

watch(
  () => showSelector.value,
  (open) => {
    if (open) {
      modalSnapshot.value = {
        voiceId: appStore.currentVoice.id,
        speed: appStore.audioConfig.speed,
        pitch: appStore.audioConfig.pitch,
        volume: appStore.audioConfig.volume,
      };
      previewDraft.value = {
        speed: appStore.audioConfig.speed,
        pitch: appStore.audioConfig.pitch,
        volume: appStore.audioConfig.volume,
      };
      pendingVoiceId.value = selectorTargetVoiceId.value;
    } else {
      stopPreview();
      isPreviewing.value = false;
    }
  }
);

watch(
  () => selectorTargetVoiceId.value,
  (voiceId) => {
    pendingVoiceId.value = voiceId;
  },
  { immediate: true }
);

const togglePreview = async () => {
  if (isPreviewing.value) {
    stopPreview();
    isPreviewing.value = false;
    return;
  }

  const voice = pendingVoice.value;
  const previewText = t('voice.previewUtterance', { name: voice.name });
  try {
    appStore.setAudioConfig({
      voice_id: voice.id,
      speed: previewDraft.value.speed,
      pitch: previewDraft.value.pitch,
      volume: previewDraft.value.volume,
    });
    isPreviewing.value = true;
    await playPreview(previewText);
  } catch (e) {
    console.error(e);
    alert(t('voice.previewFailed', { error: String(e) }));
  } finally {
    isPreviewing.value = false;
  }
};
</script>

<style scoped>
.voice-card-shell {
  width: 262px;
  max-width: 100%;
  margin-left: auto;
  padding-right: 0;
  box-sizing: border-box;
  overflow: visible;
}

.voice-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.voice-top {
  width: 100%;
  align-self: stretch;
  min-height: 104px;
  padding: 16px 16px;
  border: 1px solid #ffd4b4;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 248, 243, 0.98), rgba(255, 244, 236, 0.94));
  box-shadow: 0 6px 18px rgba(249, 115, 22, 0.05);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
  transition: width 0.28s ease, border-radius 0.28s ease;
}

.voice-top--open {
  width: 100%;
  align-self: stretch;
  border-radius: 18px 18px 0 0;
  justify-content: space-between;
  border-bottom: none;
}

.voice-main {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
  overflow: hidden;
}

.voice-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #ff7a1a;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.voice-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.voice-name {
  flex: 1 1 0%;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
  min-width: 0;
  line-height: 1.3;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.more-btn {
  height: 32px;
  width: auto;
  min-width: 0;
  max-width: none;
  padding: 0 10px;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.voice-selector-modal {
  width: min(760px, calc(100% - 32px));
  max-height: min(760px, calc(100vh - 32px));
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
}

.modal-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 24px;
  border-bottom: 1px solid #ffe4d4;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  text-align: center;
  width: 100%;
  padding: 0 40px;
  box-sizing: border-box;
}

.close-btn {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.modal-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.voice-list {
  flex: 1;
  min-height: 0;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.voice-config {
  flex-shrink: 0;
  border-top: 2px solid #ffb366;
  padding: 16px 24px 20px;
  background: linear-gradient(180deg, #fffdfb 0%, #fff 100%);
}

.voice-config__title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 14px;
}

.voice-config__row {
  margin-bottom: 14px;
}

.voice-config__row:last-of-type {
  margin-bottom: 12px;
}

.voice-config__label {
  display: block;
  font-size: 13px;
  color: #475569;
  margin-bottom: 8px;
}

.voice-config__pitch-row {
  display: block;
}

.voice-config__pitch-legend {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}

.voice-config__edge {
  font-size: 12px;
  line-height: 1.35;
  color: #64748b;
  min-width: 0;
  flex: 1 1 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.voice-config__edge--right {
  text-align: right;
}

.voice-config__pitch-value {
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  margin-top: 6px;
}

.voice-config__slider {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  accent-color: #ff7a1a;
  cursor: pointer;
}

.voice-config__preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding: 10px 18px;
  border: none;
  border-radius: 12px;
  background: #ff7a1a;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 122, 26, 0.35);
}

.voice-config__preview:hover {
  background: #f97316;
}

.voice-config__preview-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.voice-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 18px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.voice-item.active {
  border-color: #f59e0b;
  box-shadow: inset 0 0 0 1px rgba(249, 115, 22, 0.15);
  background: linear-gradient(180deg, #fffaf5 0%, #fff 100%);
}

.voice-item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.voice-item-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-item-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.voice-item-desc {
  font-size: 13px;
  line-height: 1.6;
  color: #4b5563;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px 24px 20px;
  border-top: 1px solid #edf2f7;
}

.footer-btn {
  min-width: 112px;
  min-height: 40px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  white-space: normal;
  text-align: center;
}

.footer-btn--ghost {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
}

.footer-btn--primary {
  border: 1px solid #ff7a1a;
  background: #ff7a1a;
  color: #fff;
}

@media (max-width: 900px) {
  .voice-selector-modal {
    width: calc(100% - 24px);
    max-height: calc(100vh - 24px);
  }

  .voice-list {
    grid-template-columns: 1fr;
  }
}
</style>



