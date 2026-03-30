<template>
  <div class="settings-panel">
    <div class="setting-block">
      <div class="setting-head">
        <span class="setting-title">{{ t('voice.speed') }}</span>
        <span class="setting-inline">{{ audioConfig.speed.toFixed(1) }}x</span>
      </div>
      <input v-model.number="speedValue" class="slider" type="range" min="0.5" max="2" step="0.1" />
    </div>

    <div class="setting-block">
      <div class="setting-head">
        <span class="setting-title">{{ t('voice.volume') }}</span>
      </div>
      <div class="slider-row">
        <span>{{ t('voice.small') }}</span>
        <input v-model.number="volumeValue" class="slider" type="range" min="0" max="2" step="0.1" />
        <span>{{ t('voice.large') }}</span>
      </div>
      <div class="setting-value">{{ Math.round(audioConfig.volume * 10) }}</div>
    </div>

    <div class="setting-block setting-block--last">
      <div class="setting-head">
        <span class="setting-title">{{ t('voice.pitch') }}</span>
      </div>
      <div class="slider-row">
        <span>{{ t('voice.low') }}</span>
        <input v-model.number="pitchStep" class="slider" type="range" min="0" max="10" step="1" />
        <span>{{ t('voice.high') }}</span>
      </div>
      <div class="setting-value">{{ pitchStep }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../stores/appStore';

const appStore = useAppStore();
const { t } = useI18n();
const audioConfig = computed(() => appStore.audioConfig);

const speedValue = computed({
  get: () => appStore.audioConfig.speed,
  set: (value: number) => appStore.setAudioConfig({ speed: value }),
});

const volumeValue = computed({
  get: () => appStore.audioConfig.volume,
  set: (value: number) => appStore.setAudioConfig({ volume: value }),
});

const pitchStep = computed({
  get: () => Math.round(((appStore.audioConfig.pitch - 0.5) / 1.5) * 10),
  set: (value: number) => {
    const normalized = Math.max(0, Math.min(10, Number(value) || 0));
    appStore.setAudioConfig({ pitch: 0.5 + (normalized / 10) * 1.5 });
  },
});
</script>

<style scoped>
/* 与 VoiceEditor .text-editor min-height:420px 对齐，展开区约为输入区一半高度 */
.settings-panel {
  width: 100%;
  max-height: 210px;
  padding: 0 12px 10px;
  border: 1px solid #ffd2b0;
  border-top: none;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(180deg, rgba(255, 248, 243, 0.98), rgba(255, 244, 236, 0.94));
  box-sizing: border-box;
  display: grid;
  grid-template-rows: repeat(3, auto);
  gap: 2px;
  overflow-y: auto;
}

.setting-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
  border-top: 1px solid rgba(251, 146, 60, 0.2);
}

.setting-block:first-child {
  border-top: none;
}

.setting-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.setting-title,
.setting-inline,
.setting-value,
.slider-row {
  color: #334155;
}

.setting-title,
.setting-inline {
  font-size: 12px;
}

.setting-title {
  font-weight: 600;
}

.slider-row {
  display: grid;
  grid-template-columns: minmax(46px, auto) 1fr minmax(46px, auto);
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.slider-row > span {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slider-row > span:first-child {
  text-align: left;
}

.slider-row > span:last-child {
  text-align: right;
}

.setting-value {
  margin-top: 2px;
  text-align: center;
  font-size: 11px;
  line-height: 1.2;
}

.slider {
  width: 100%;
  height: 12px;
  accent-color: #ff7a1a;
}
</style>
