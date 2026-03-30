<template>
  <div class="status-bar">
    <div class="status-left">
      <template v-if="isPreviewGenerating">
        <button class="preview-btn preview-btn--generating" type="button" disabled>
          <span class="preview-btn__spinner" aria-hidden="true"></span>
          <span>{{ t('statusBar.generating', { percent: displayGenerationProgress }) }}</span>
        </button>

        <button class="cancel-btn" type="button" @click="handleCancelPreviewGeneration">
          <svg class="cancel-btn__icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
          <span>{{ t('statusBar.cancel') }}</span>
        </button>

        <div class="generation-progress" aria-hidden="true">
          <div class="generation-progress__track">
            <div class="generation-progress__fill" :style="{ width: `${displayGenerationProgress}%` }"></div>
          </div>
          <span class="generation-progress__text">{{ displayGenerationProgress }}%</span>
        </div>
      </template>

      <template v-else>
        <button
          class="preview-btn"
          :class="{ 'preview-btn--active': canPreview && !isGenerating }"
          :disabled="!canPreview || isGenerating"
          @click="handlePreview"
        >
          <span v-if="previewState === 'playing'">{{ t('statusBar.pause') }}</span>
          <span v-else>{{ t('statusBar.preview') }}</span>
        </button>

        <div
          v-if="showPlaybackProgress"
          ref="progressTrackRef"
          class="playback-progress"
          @pointerdown="handleTrackPointer"
          @lostpointercapture="handleTrackLostPointerCapture"
        >
          <div ref="playbackRailRef" class="playback-track">
            <div class="playback-fill" :class="{ dragging: isDraggingProgress }" :style="{ width: `${displayPreviewProgress}%` }"></div>
            <div class="playback-thumb" :style="{ left: `${displayPreviewProgress}%` }"></div>
          </div>
          <span class="playback-time">{{ previewTimeLabel }}</span>
        </div>
      </template>
    </div>

    <div class="status-right">
      <span class="char-count">{{ charCount }}/{{ maxLength }}</span>
      <span class="estimate-text">{{ t('statusBar.estimatedDuration', { duration: formattedDuration }) }}</span>
      <button
        class="export-btn"
        :class="{ 'export-btn--active': canPreview && !isGenerating }"
        :disabled="!canPreview || isGenerating || isPreviewGenerating"
        @click="handleExport"
      >
        {{ isGenerating ? t('statusBar.exporting') : t('statusBar.export') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../stores/appStore';
import {
  cancelExportAudio,
  estimateDuration,
  exportAudioByApi,
  validateExportAssets,
} from '../services/webTtsService';
import { formatDuration } from '../utils/textWorkflow';

const appStore = useAppStore();
const { t } = useI18n();
const isGenerating = ref(false);
const isPreviewGenerating = ref(false);
const previewGenerationProgress = ref(0);
const progressTrackRef = ref<HTMLDivElement | null>(null);
const playbackRailRef = ref<HTMLDivElement | null>(null);
const isDraggingProgress = ref(false);
const dragPreviewProgress = ref(0);
const resumeAfterDragRef = ref(false);
const previewAudioRef = ref<HTMLAudioElement | null>(null);
const previewObjectUrlRef = ref<string | null>(null);
const previewProgressRafRef = ref<number | null>(null);
const previewGenerationTimerRef = ref<number | null>(null);

const maxLength = computed(() => appStore.maxLength);
const charCount = computed(() => appStore.charCount);
const canPreview = computed(() => appStore.text.trim().length > 0);
const estimatedSeconds = computed(() => estimateDuration(appStore.text, appStore.audioConfig.speed));
const formattedDuration = computed(() => formatDuration(estimatedSeconds.value));
const previewState = computed(() => appStore.previewState);
const previewProgress = computed(() => appStore.previewProgress);
const displayPreviewProgress = computed(() => (isDraggingProgress.value ? dragPreviewProgress.value : previewProgress.value));
const previewSignature = computed(() =>
  JSON.stringify({
    text: appStore.text,
    voice_id: appStore.audioConfig.voice_id,
    speed: appStore.audioConfig.speed,
    pitch: appStore.audioConfig.pitch,
    volume: appStore.audioConfig.volume,
    bgmPath: appStore.audioConfig.bgmPath ?? null,
    bgmVolume: appStore.audioConfig.bgmVolume ?? null,
  })
);
const showPlaybackProgress = computed(() => previewState.value !== 'idle' || previewProgress.value > 0);
const displayGenerationProgress = computed(() => Math.max(0, Math.min(99, Math.round(previewGenerationProgress.value))));
const previewTimeLabel = computed(() => {
  const currentSeconds = (estimatedSeconds.value * displayPreviewProgress.value) / 100;
  return `${formatDuration(currentSeconds)} / ${formattedDuration.value}`;
});

const syncPreviewHandlers = () => ({
  onProgress(progress: { percentage: number }) {
    appStore.setPreviewProgress(progress.percentage);
  },
  onStateChange(state: 'idle' | 'playing' | 'paused') {
    appStore.setPreviewState(state);
  },
});

const releasePreviewUrl = () => {
  if (!previewObjectUrlRef.value) return;
  URL.revokeObjectURL(previewObjectUrlRef.value);
  previewObjectUrlRef.value = null;
};

const stopPreviewProgressLoop = () => {
  if (previewProgressRafRef.value === null) return;
  window.cancelAnimationFrame(previewProgressRafRef.value);
  previewProgressRafRef.value = null;
};

const stopPreviewGenerationProgress = () => {
  if (previewGenerationTimerRef.value === null) return;
  window.clearInterval(previewGenerationTimerRef.value);
  previewGenerationTimerRef.value = null;
};

const startPreviewGenerationProgress = () => {
  stopPreviewGenerationProgress();
  previewGenerationProgress.value = 6;
  previewGenerationTimerRef.value = window.setInterval(() => {
    previewGenerationProgress.value = Math.min(95, previewGenerationProgress.value + (previewGenerationProgress.value < 70 ? 6 : 2));
  }, 260);
};

const syncPreviewProgressFromAudio = () => {
  const audio = previewAudioRef.value;
  if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
  appStore.setPreviewProgress((audio.currentTime / audio.duration) * 100);
};

const startPreviewProgressLoop = () => {
  stopPreviewProgressLoop();

  const tick = () => {
    const audio = previewAudioRef.value;
    if (!audio) {
      previewProgressRafRef.value = null;
      return;
    }

    syncPreviewProgressFromAudio();

    if (!audio.paused && !audio.ended) {
      previewProgressRafRef.value = window.requestAnimationFrame(tick);
      return;
    }

    previewProgressRafRef.value = null;
  };

  previewProgressRafRef.value = window.requestAnimationFrame(tick);
};

const detachPreviewAudio = () => {
  const audio = previewAudioRef.value;
  stopPreviewProgressLoop();
  if (!audio) return;
  audio.pause();
  audio.ontimeupdate = null;
  audio.onplay = null;
  audio.onpause = null;
  audio.onended = null;
  audio.onloadedmetadata = null;
  audio.onerror = null;
  previewAudioRef.value = null;
};

const resetPreviewUi = () => {
  stopPreviewGenerationProgress();
  isPreviewGenerating.value = false;
  previewGenerationProgress.value = 0;
  detachPreviewAudio();
  releasePreviewUrl();
  appStore.resetPreview();
};

watch(
  () => previewSignature.value,
  () => {
    if (appStore.previewState !== 'idle' || appStore.previewProgress > 0) {
      resetPreviewUi();
    }
  }
);

const getExportErrorMessage = (error: unknown) => {
  const message = (error as Error)?.message || t('statusBar.exportErrors.generic', { error: 'unknown' });
  const lower = message.toLowerCase();

  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized')) {
    return t('statusBar.exportErrors.authExpired');
  }
  if (lower.includes('timeout') || message.includes('超时')) {
    return t('statusBar.exportErrors.timeout');
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return t('statusBar.exportErrors.network');
  }
  if (lower.includes('资源') || lower.includes('asset')) {
    return t('statusBar.exportErrors.asset', { error: message });
  }
  return t('statusBar.exportErrors.generic', { error: message });
};

const startPreviewFromCurrentText = async () => {
  appStore.saveHistoryBackupRecord();
  appStore.setPreviewProgress(0);
  isPreviewGenerating.value = true;
  startPreviewGenerationProgress();

  try {
    const blob = await exportAudioByApi(appStore.text, appStore.audioConfig);
    previewGenerationProgress.value = 100;
    stopPreviewGenerationProgress();
    detachPreviewAudio();
    releasePreviewUrl();

    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    previewObjectUrlRef.value = objectUrl;
    previewAudioRef.value = audio;

    audio.onloadedmetadata = () => {
      appStore.setPreviewProgress(0);
    };
    audio.onplay = () => {
      appStore.setPreviewState('playing');
      startPreviewProgressLoop();
    };
    audio.onpause = () => {
      if (audio.ended) return;
      syncPreviewProgressFromAudio();
      stopPreviewProgressLoop();
      appStore.setPreviewState('paused');
    };
    audio.onended = () => {
      stopPreviewProgressLoop();
      appStore.setPreviewProgress(100);
      appStore.setPreviewState('idle');
    };
    audio.ontimeupdate = () => {
      syncPreviewProgressFromAudio();
    };
    audio.onerror = () => {
      stopPreviewProgressLoop();
      resetPreviewUi();
      window.alert(t('statusBar.exportErrors.generic', { error: 'preview failed' }));
    };

    await audio.play();
  } catch (error) {
    if (!['AbortError', 'ExportCancelled'].includes((error as Error)?.name || '') &&
        !['abort', 'exportcancelled'].some((keyword) => String((error as Error)?.message || '').toLowerCase().includes(keyword))) {
      throw error;
    }
  } finally {
    stopPreviewGenerationProgress();
    isPreviewGenerating.value = false;
    previewGenerationProgress.value = 0;
  }
};

const getProgressPercentageFromClientX = (clientX: number) => {
  const rail = playbackRailRef.value;
  if (!rail) return null;
  const rect = rail.getBoundingClientRect();
  const percentage = ((clientX - rect.left) / rect.width) * 100;
  return Math.max(0, Math.min(100, percentage));
};

const handlePreview = async () => {
  if (!appStore.text.trim()) return;
  if (isPreviewGenerating.value) return;

  const audio = previewAudioRef.value;

  if (appStore.previewState === 'playing') {
    audio?.pause();
    return;
  }

  if (appStore.previewState === 'paused') {
    await audio?.play();
    return;
  }

  await startPreviewFromCurrentText();
};

const handleCancelPreviewGeneration = async () => {
  await cancelExportAudio();
  stopPreviewGenerationProgress();
  isPreviewGenerating.value = false;
  previewGenerationProgress.value = 0;
};

const seekToPercentage = async (normalized: number) => {
  if (!appStore.text.trim()) return;
  const audio = previewAudioRef.value;
  if (!audio) {
    await startPreviewFromCurrentText();
    return;
  }

  if (audio.duration && Number.isFinite(audio.duration)) {
    audio.currentTime = (normalized / 100) * audio.duration;
    appStore.setPreviewProgress(normalized);
    if (!audio.paused && !audio.ended) {
      startPreviewProgressLoop();
    }
  }
};

const syncSeekToPercentage = (normalized: number) => {
  const audio = previewAudioRef.value;
  if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
  audio.currentTime = (normalized / 100) * audio.duration;
  appStore.setPreviewProgress(normalized);
};

const handleDragMove = (event: PointerEvent) => {
  if (!isDraggingProgress.value) return;
  const normalized = getProgressPercentageFromClientX(event.clientX);
  if (normalized === null) return;
  dragPreviewProgress.value = normalized;
  syncSeekToPercentage(normalized);
};

const stopDraggingProgress = async (event?: PointerEvent) => {
  if (!isDraggingProgress.value) return;

  window.removeEventListener('pointermove', handleDragMove);
  window.removeEventListener('pointerup', handleDragEnd);

  const finalPercentage = event ? getProgressPercentageFromClientX(event.clientX) : dragPreviewProgress.value;
  if (finalPercentage === null || Number.isNaN(finalPercentage)) return;

  dragPreviewProgress.value = finalPercentage;
  appStore.setPreviewProgress(finalPercentage);
  await seekToPercentage(finalPercentage);
  isDraggingProgress.value = false;

  if (resumeAfterDragRef.value) {
    resumeAfterDragRef.value = false;
    await previewAudioRef.value?.play();
    return;
  }

  resumeAfterDragRef.value = false;
};

const handleDragEnd = async (event: PointerEvent) => {
  await stopDraggingProgress(event);
};

const handleTrackLostPointerCapture = async (event: PointerEvent) => {
  await stopDraggingProgress(event);
};

const handleTrackPointer = (event: PointerEvent) => {
  if (!appStore.text.trim()) return;
  event.preventDefault();
  const normalized = getProgressPercentageFromClientX(event.clientX);
  if (normalized === null) return;
  const audio = previewAudioRef.value;
  const track = progressTrackRef.value;

  isDraggingProgress.value = true;
  dragPreviewProgress.value = normalized;
  appStore.setPreviewProgress(normalized);
  resumeAfterDragRef.value = Boolean(audio && !audio.paused && !audio.ended);
  if (resumeAfterDragRef.value) {
    audio?.pause();
  }
  window.addEventListener('pointermove', handleDragMove);
  window.addEventListener('pointerup', handleDragEnd);
  track?.setPointerCapture?.(event.pointerId);
  void seekToPercentage(normalized);
};

const handleExport = async () => {
  if (!appStore.text.trim()) return;

  try {
    const validation = validateExportAssets(appStore.text, appStore.audioConfig);
    if (!validation.ok) {
      const messages: string[] = [];
      if (validation.missingSoundEffects.length > 0) {
        messages.push(t('statusBar.exportErrors.missingSoundEffects', { names: validation.missingSoundEffects.join('、') }));
      }
      if (validation.missingBgm) {
        messages.push(t('statusBar.exportErrors.invalidBgm'));
      }
      window.alert(messages.join('\n'));
      return;
    }

    isGenerating.value = true;
    appStore.setGenerating(true);
    const blob = await exportAudioByApi(appStore.text, appStore.audioConfig);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lingjing-audio-${Date.now()}.mp3`;
    link.click();
    URL.revokeObjectURL(url);
    appStore.saveHistoryBackupRecord();
  } catch (error) {
    console.error('export failed', error);
    window.alert(getExportErrorMessage(error));
  } finally {
    isGenerating.value = false;
    appStore.setGenerating(false);
  }
};

const handleStopPreviewEvent = () => {
  resetPreviewUi();
};

onMounted(() => {
  document.addEventListener('status-bar-stop-preview', handleStopPreviewEvent);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleDragMove);
  window.removeEventListener('pointerup', handleDragEnd);
  document.removeEventListener('status-bar-stop-preview', handleStopPreviewEvent);
  resumeAfterDragRef.value = false;
  stopPreviewProgressLoop();
  stopPreviewGenerationProgress();
  resetPreviewUi();
});
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: linear-gradient(90deg, #fdf4ee 0%, #fdf6f2 50%, #fff8e9 100%);
  border-top: 1px solid #f0d1b6;
  overflow: hidden;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.char-count,
.estimate-text {
  font-size: 12px;
  color: #f97316;
  white-space: nowrap;
}

.estimate-text {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-btn,
.export-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #b8c2d2;
  background: linear-gradient(180deg, #7f8ea0 0%, #66778e 100%);
  color: #fff;
  white-space: nowrap;
}

.preview-btn--generating {
  gap: 8px;
  border-color: transparent;
  background: linear-gradient(180deg, #7a879a 0%, #647387 100%);
  box-shadow: 0 10px 24px rgba(89, 101, 120, 0.24);
  opacity: 1;
}

.preview-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: preview-spin 0.85s linear infinite;
}

.preview-btn--active,
.export-btn--active {
  border-color: #ff6900;
  background: #ff6900;
}

.preview-btn:disabled,
.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.playback-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  padding: 8px 0;
  cursor: pointer;
  user-select: none;
  touch-action: none;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid #ffb0bb;
  background: #fff;
  color: #ff3d5f;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.cancel-btn:hover {
  background: #fff5f7;
  border-color: #ff8ea1;
  box-shadow: 0 10px 24px rgba(255, 88, 120, 0.12);
}

.cancel-btn__icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.generation-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 220px;
}

.generation-progress__track {
  position: relative;
  width: 164px;
  height: 10px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.generation-progress__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ff7a00 0%, #ff425b 100%);
  transition: width 0.25s ease;
}

.generation-progress__text {
  font-size: 12px;
  color: #666f80;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.playback-track {
  position: relative;
  width: 220px;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
  overflow: visible;
}

.playback-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fb923c 0%, #f97316 100%);
  transition: width 0.15s linear;
}

.playback-fill.dragging {
  transition: none;
}

.playback-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f97316;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9);
}

.playback-time {
  font-size: 12px;
  color: #a34d3d;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

@keyframes preview-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
