<template>
  <Teleport to="body">
    <div class="history-overlay" @click.self="$emit('close')">
      <div class="history-panel">
      <div class="history-header">
        <div class="history-title-wrap">
          <span class="history-title-icon">O</span>
          <div class="history-title-text">
            <h3>{{ t('history.title') }}</h3>
            <span class="history-total">({{ t('history.total', { count: appStore.historyRecords.length }) }})</span>
          </div>
        </div>
        <button type="button" class="close-btn" @click="$emit('close')">x</button>
      </div>

      <div class="history-tools">
        <div class="history-search">
          <span class="history-search__icon">Q</span>
          <input v-model.trim="keyword" class="search-input" :placeholder="t('history.search')" />
        </div>
        <button class="clear-btn" :disabled="appStore.historyRecords.length === 0" @click="clearAll">
          <span class="clear-btn__icon" aria-hidden="true">🗑</span>
          <span>{{ t('history.clearAll') }}</span>
        </button>
      </div>

      <div class="history-content">
        <div v-if="displayRecords.length === 0" class="history-empty">
          {{ keyword ? t('history.noMatchRecords') : t('history.noRecords') }}
        </div>

        <button
          v-for="entry in displayRecords"
          :key="entry.id"
          class="history-item"
          type="button"
          @click="restoreEntry(entry.id)"
        >
          <div class="history-item__head">
            <div class="history-item__title">{{ entry.title }}</div>
            <button type="button" class="history-item__delete" @click.stop="remove(entry.id)">x</button>
          </div>

          <div class="history-item__meta">
            <span class="history-item__meta-part">O {{ formatTime(entry.timestamp) }}</span>
            <span class="history-item__meta-part">{{ entry.characterCount }} {{ t('history.characters') }}</span>
            <span v-if="entry.voiceName" class="history-item__voice">{{ entry.voiceName }}</span>
          </div>

          <div class="history-item__summary" v-html="entry.summaryHtml"></div>

          <div class="history-item__preview">
            <img v-if="entry.voiceAvatar" :src="entry.voiceAvatar" class="history-item__avatar" :alt="entry.voiceName || 'voice'" />
            <div class="history-item__preview-text" v-html="entry.previewHtml"></div>
          </div>
        </button>
      </div>

      <div class="history-footer">
        {{ t('history.clickToRestore') }}
      </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCuratedVoiceById } from '../config/voiceCatalog';
import { useAppStore } from '../stores/appStore';

defineEmits(['close']);

const appStore = useAppStore();
const keyword = ref('');
const { t } = useI18n();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const stripTags = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const getNumberModeLabel = (mode: string) => {
  const labels: Record<string, string> = {
    cardinal: '读数值',
    digits: '读数字',
    telephone: '读号码',
    ordinal: '读序数',
  };
  return labels[mode] || mode;
};

const getSoundEffectLabel = (effectId: string) => {
  const labels: Record<string, string> = {
    applause: '掌声',
    laugh: '笑声',
    gasp: '惊讶',
    doorbell: '门铃',
    'phone-ring': '电话铃声',
    knock: '敲门',
    notification: '通知',
    success: '成功',
    warning: '警告',
  };
  return labels[effectId] || effectId;
};

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
};

const renderHistoryRichText = (rawText: string) => {
  const source = rawText || '';
  const html = escapeHtml(source)
    .replace(/&lt;number\s+mode=&quot;([^&]+)&quot;&gt;([\s\S]*?)&lt;\/number&gt;/g, (_m, mode, content) => {
      return `<span class="preview-inline preview-inline--number">${escapeHtml(content)}[${getNumberModeLabel(mode)}]</span>`;
    })
    .replace(/&lt;polyphone\s+pronunciation=&quot;([^&]+)&quot;&gt;([\s\S]*?)&lt;\/polyphone&gt;/g, (_m, pronunciation, content) => {
      return `<span class="preview-inline preview-inline--polyphone">${escapeHtml(content)}[${escapeHtml(pronunciation)}]</span>`;
    })
    .replace(/&lt;pause\s+ms=&quot;(\d+)&quot;\s*\/&gt;/g, (_m, ms) => {
      return `<span class="preview-inline preview-inline--pause">停顿${ms}ms</span>`;
    })
    .replace(/&lt;reread&gt;([\s\S]*?)&lt;\/reread&gt;/g, (_m, content) => {
      return `<span class="preview-inline preview-inline--reread">重读 ${escapeHtml(content)}</span>`;
    })
    .replace(/&lt;sound\s+effect=&quot;([^&]+)&quot;\s*\/&gt;/g, (_m, effectId) => {
      return `<span class="preview-inline preview-inline--sound">${getSoundEffectLabel(effectId)}</span>`;
    })
    .replace(/&lt;voice\s+voice_id=&quot;([^&]+)&quot;\s+voice_name=&quot;([^&]+)&quot;(?:\s+voice_avatar=&quot;([^&]*)&quot;)?&gt;([\s\S]*?)&lt;\/voice&gt;/g, (_m, _voiceId, voiceName, _avatar, content) => {
      return `<span class="preview-inline preview-inline--voice">[${escapeHtml(voiceName)}]</span>${escapeHtml(content)}`;
    })
    .replace(/&lt;speed\s+rate=&quot;([^&]+)&quot;&gt;([\s\S]*?)&lt;\/speed&gt;/g, (_m, rate, content) => {
      return `<span class="preview-inline preview-inline--speed">${escapeHtml(content)}[${escapeHtml(rate)}x]</span>`;
    })
    .replace(/\n+/g, ' ');

  return html.replace(/\s+/g, ' ').trim() || t('history.blank');
};

const displayRecords = computed(() => {
  const records = appStore.historyRecords.map((record) => {
    const voice = record.voiceConfig ? getCuratedVoiceById(record.voiceConfig.id) : null;
    const plainSummary = stripTags(record.text) || t('history.blank');
    const summaryText = plainSummary.slice(0, 120);
    const summaryHtml = renderHistoryRichText(truncateText(record.text, 180));
    const previewHtml = renderHistoryRichText(truncateText(record.text, 80));

    return {
      ...record,
      voiceName: voice?.name || record.voiceConfig?.name || '',
      voiceAvatar: voice?.avatar || '',
      summaryText,
      summaryHtml,
      previewHtml,
    };
  });

  if (!keyword.value) return records;
  const key = keyword.value.toLowerCase();
  return records.filter((record) => {
    return (
      record.title.toLowerCase().includes(key) ||
      record.summaryText.toLowerCase().includes(key) ||
      record.voiceName.toLowerCase().includes(key)
    );
  });
});

const restoreEntry = (id: string) => {
  const target = appStore.historyRecords.find((record) => record.id === id);
  if (!target) return;
  appStore.loadHistoryBackupRecord(target);
  appStore.toggleHistoryPanel();
};

const clearAll = () => {
  if (!window.confirm(t('history.confirmClearAllBackups'))) return;
  appStore.clearHistoryBackupRecords();
};

const remove = (id: string) => {
  if (!window.confirm(t('history.confirmDelete'))) return;
  appStore.deleteHistoryBackupRecord(id);
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

  if (sameDay) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}-${date.getDate()} ${time}`;
};
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 244, 236, 0.45);
  backdrop-filter: blur(6px);
}

.history-panel {
  width: min(820px, calc(100vw - 72px));
  height: min(760px, calc(100vh - 72px));
  background: #fff;
  border: 1px solid #e9edf3;
  border-radius: 12px;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  height: 72px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf1f5;
}

.history-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-title-icon {
  color: #5d81e7;
  font-size: 18px;
}

.history-title-text {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.history-title-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.history-total {
  color: #6b7280;
  font-size: 13px;
}

.close-btn {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.history-tools {
  padding: 14px 14px 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #edf1f5;
}

.history-search {
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid #e1e6ee;
  border-radius: 8px;
  background: #fff;
}

.history-search__icon {
  color: #9aa4b2;
  font-size: 12px;
  font-weight: 700;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #334155;
  font-size: 14px;
}

.clear-btn {
  border: none;
  background: transparent;
  color: #e05a5a;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.clear-btn__icon {
  font-size: 14px;
  line-height: 1;
}

.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #fafbfd;
}

.history-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: #94a3b8;
  font-size: 14px;
}

.history-item {
  width: 100%;
  border: 1px solid #e8edf3;
  border-radius: 10px;
  background: #fff;
  padding: 16px 16px 14px;
  margin-bottom: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.history-item:hover {
  border-color: #d2dcea;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.history-item__title {
  color: #374151;
  font-size: 15px;
  font-weight: 700;
}

.history-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-item__delete {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #c4cbd5;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.history-item:hover .history-item__delete {
  color: #ef4444;
  background: #fff1f2;
}

.history-item__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
}

.history-item__voice {
  color: #6b8ddf;
}

.history-item__summary {
  margin-top: 10px;
  color: #5b6472;
  font-size: 13px;
  line-height: 1.8;
  word-break: break-all;
  max-height: 48px;
  overflow: hidden;
}

.history-item__preview {
  margin-top: 8px;
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid #f4e8c8;
  background: linear-gradient(180deg, #fffaf0 0%, #fff7ea 100%);
  overflow: hidden;
}

.history-item__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid #e6d7c1;
}

.history-item__preview-text {
  min-width: 0;
  color: #6b5b4a;
  font-size: 12px;
  line-height: 1.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.preview-inline) {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  border-radius: 4px;
  margin: 0 1px;
}

:deep(.preview-inline--voice) {
  color: #5978b7;
  background: #eef4ff;
}

:deep(.preview-inline--number) {
  color: #14a37f;
  background: #ebfbf5;
}

:deep(.preview-inline--pause) {
  color: #8a63d2;
  background: #f3ecff;
}

:deep(.preview-inline--polyphone) {
  color: #3b82f6;
  background: #eff6ff;
}

:deep(.preview-inline--reread) {
  color: #8b5cf6;
  background: #f5f3ff;
}

:deep(.preview-inline--sound) {
  color: #c26c18;
  background: #fff4e5;
}

:deep(.preview-inline--speed) {
  color: #c59a12;
  background: #fff8db;
}

.history-footer {
  height: 46px;
  border-top: 1px solid #edf1f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b94a2;
  font-size: 12px;
  background: #fff;
}

@media (max-width: 768px) {
  .history-panel {
    width: calc(100vw - 20px);
    height: calc(100vh - 20px);
  }

  .history-tools {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .clear-btn {
    justify-content: flex-end;
  }
}
</style>
