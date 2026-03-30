<template>
  <div class="import-overlay" @click.self="closeDialog">
    <div class="import-dialog">
      <div class="import-header">
        <div>
          <h3>{{ $t('import.title') }}</h3>
          <p>{{ $t('import.supportFormat') }}</p>
        </div>
        <button class="close-btn" @click="closeDialog">×</button>
      </div>

      <div class="import-body">
        <div class="import-actions">
          <button class="file-btn" @click="pickFile">{{ $t('import.selectDocument') }}</button>
          <span v-if="selectedFileName" class="file-name">{{ selectedFileName }}</span>
        </div>

        <textarea
          v-model="draftText"
          class="import-textarea"
          :placeholder="$t('textEditor.placeholder')"
        ></textarea>

        <div class="import-mode">
          <button
            class="mode-btn"
            :class="{ active: importMode === 'append' }"
            @click="importMode = 'append'"
          >
            {{ $t('import.append') }}
          </button>
          <button
            class="mode-btn"
            :class="{ active: importMode === 'replace' }"
            @click="importMode = 'replace'"
          >
            {{ $t('import.replace') }}
          </button>
        </div>
      </div>

      <div class="import-footer">
        <span class="limit-tip">{{ $t('statusBar.charCount', { count: draftCharCount }) }}</span>
        <div class="footer-actions">
          <button class="ghost-btn" @click="closeDialog">{{ $t('voice.cancel') }}</button>
          <button class="primary-btn" @click="confirmImport">{{ $t('toolbar.import') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import mammoth from 'mammoth/mammoth.browser';
import { useAppStore } from '../stores/appStore';

const appStore = useAppStore();
const { t } = useI18n();

const draftText = ref('');
const importMode = ref<'append' | 'replace'>('append');
const selectedFileName = ref('');
const INVISIBLE_CHAR_REGEX = /[\u200B-\u200D\uFEFF\u00AD]/g;
const draftCharCount = computed(() => draftText.value.replace(INVISIBLE_CHAR_REGEX, '').length);

const sanitizeImportedText = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(INVISIBLE_CHAR_REGEX, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const closeDialog = () => {
  draftText.value = '';
  importMode.value = 'append';
  selectedFileName.value = '';
  appStore.toggleImportDialog();
};

const pickFile = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.doc,.docx';
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    selectedFileName.value = file.name;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.txt')) {
      draftText.value = sanitizeImportedText(await file.text());
      return;
    }

    if (fileName.endsWith('.docx')) {
      try {
        const buffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
        draftText.value = sanitizeImportedText(value);
      } catch (error) {
        console.error('docx parse failed', error);
        window.alert(t('import.importFailed', { error: 'DOCX parse failed' }));
      }
      return;
    }

    window.alert(t('import.invalidFormat'));
  };
  input.click();
};

const confirmImport = () => {
  const incomingText = draftText.value.trim();
  if (!incomingText) {
    window.alert(t('toast.noTextInput'));
    return;
  }

  const nextText =
    importMode.value === 'append'
      ? `${appStore.text}${appStore.text ? '\n' : ''}${incomingText}`
      : incomingText;

  const nextVisibleCount = nextText.replace(INVISIBLE_CHAR_REGEX, '').length;
  if (nextVisibleCount > appStore.maxLength) {
    window.alert(t('toast.textTooLong', { count: nextVisibleCount, max: appStore.maxLength }));
    return;
  }

  appStore.setText(nextText);
  closeDialog();
};
</script>

<style scoped>
.import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.import-dialog {
  width: min(760px, calc(100% - 24px));
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.import-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #f1f5f9;
}

.import-header h3 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.import-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  font-size: 22px;
  cursor: pointer;
}

.import-body {
  padding: 20px 24px;
}

.import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.file-btn {
  height: 38px;
  padding: 0 16px;
  border: 1px solid #fdba74;
  border-radius: 12px;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 600;
  cursor: pointer;
}

.file-name {
  color: #64748b;
  font-size: 13px;
}

.import-textarea {
  width: 100%;
  min-height: 280px;
  padding: 16px 18px;
  resize: vertical;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  outline: none;
  font: inherit;
  line-height: 1.8;
  color: #1f2937;
}

.import-textarea:focus {
  border-color: #fb923c;
}

.import-mode {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.mode-btn {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: #475569;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #fdba74;
  background: #fff7ed;
  color: #c2410c;
}

.import-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px 22px;
  border-top: 1px solid #f1f5f9;
}

.limit-tip {
  color: #64748b;
  font-size: 13px;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.ghost-btn,
.primary-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #475569;
}

.primary-btn {
  border: none;
  background: linear-gradient(180deg, #ff8b2b 0%, #f97316 100%);
  color: #fff;
}

@media (max-width: 768px) {
  .import-header,
  .import-body,
  .import-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .import-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .footer-actions {
    width: 100%;
  }

  .ghost-btn,
  .primary-btn {
    flex: 1;
  }
}
</style>
