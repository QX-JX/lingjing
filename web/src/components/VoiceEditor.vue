<template>
  <div class="voice-editor">
    <div class="editor-layout">
      <div class="toolbar-section">
        <Toolbar />
      </div>

      <div class="main-section">
        <div class="text-area-wrapper">
          <div
            ref="editorRef"
            class="text-editor"
            contenteditable="true"
            :data-placeholder="$t('textEditor.placeholder')"
            @input="handleInput"
            @paste="handlePaste"
            @click="updateSelectionState"
            @keyup="updateSelectionState"
            @mouseup="updateSelectionState"
            @keydown="handleKeyDown"
          ></div>

          <div
            v-if="polyphonePicker.visible"
            class="polyphone-picker"
            :style="{ left: `${polyphonePicker.x}px`, top: `${polyphonePicker.y}px` }"
            @mousedown.stop
            @click.stop
          >
            <div class="polyphone-picker__title">{{ t('polyphone.pronunciation', { char: polyphonePicker.char }) }}</div>
            <button
              v-for="option in polyphonePicker.options"
              :key="option"
              type="button"
              class="polyphone-picker__option"
              :class="{ 'polyphone-picker__option--active': option === polyphonePicker.currentPronunciation }"
              @click="applyPolyphonePronunciation(option)"
            >
              <span>{{ getToneMark(option) }}</span>
              <span class="polyphone-picker__raw">{{ option }}</span>
            </button>
          </div>
        </div>

        <div class="voice-card-wrapper">
          <VoiceCard />
        </div>
      </div>

      <div class="status-bar-section">
        <StatusBar />
      </div>
    </div>

    <HistoryPanel v-if="appStore.showHistoryPanel" @close="appStore.toggleHistoryPanel()" />
    <ImportDialog v-if="appStore.showImportDialog" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ImportDialog from './ImportDialog.vue';
import { useAppStore } from '../stores/appStore';
import HistoryPanel from './HistoryPanel.vue';
import StatusBar from './StatusBar.vue';
import Toolbar from './Toolbar.vue';
import VoiceCard from './VoiceCard.vue';
import { getPolyphoneOptions, getToneMark, isChineseChar } from '../utils/textWorkflow';

type VoiceCommand = {
  start: number;
  end: number;
  voiceId: string;
  voiceName: string;
  voiceAvatar?: string;
};

type EditorCommandDetail =
  | { type: 'insertPause'; ms: number }
  | { type: 'wrapSpeed'; rate: number }
  | { type: 'wrapReread' }
  | { type: 'wrapNumber'; mode: string }
  | ({ type: 'wrapVoice' } & VoiceCommand)
  | ({ type: 'updateVoiceMarker' } & VoiceCommand)
  | { type: 'requestVoiceWrap' }
  | { type: 'requestPolyphone' }
  | { type: 'requestToolbarPolyphone' }
  | { type: 'applyPolyphoneFromToolbar'; start: number; end: number; char: string; pronunciation: string }
  | { type: 'insertSoundEffect'; effect: string };

const appStore = useAppStore();
const { t } = useI18n();
const editorRef = ref<HTMLDivElement | null>(null);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const lastExpandedSelection = ref<{ start: number; end: number } | null>(null);
const historyTimer = ref<number | null>(null);
const previousHistoryIndex = ref(appStore.historyIndex);
const polyphonePicker = ref({
  visible: false,
  x: 0,
  y: 0,
  start: 0,
  end: 0,
  char: '',
  options: [] as string[],
  currentPronunciation: '',
});

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildMarkerChip = (modifier: string, start: number, end: number, raw: string, body: string) =>
  `<span class="marker-chip ${modifier}" contenteditable="false" data-raw="${escapeHtml(raw)}" data-start="${start}" data-end="${end}">${body}<button class="marker-remove" data-start="${start}" data-end="${end}" type="button">×</button></span>`;

const getSoundEffectLabel = (effectId: string) => {
  const keyMap: Record<string, string> = {
    applause: 'soundEffect.presets.applause',
    gasp: 'soundEffect.presets.gasp',
    knock: 'soundEffect.presets.knock',
    'phone-ring': 'soundEffect.presets.ring',
    doorbell: 'soundEffect.presets.doorbell',
    notification: 'soundEffect.presets.notification',
    laugh: 'soundEffect.presets.laugh',
    success: 'soundEffect.presets.success',
    warning: 'soundEffect.presets.warning',
  };

  const key = keyMap[effectId];
  return key ? t(key) : effectId;
};

const closePolyphonePicker = () => {
  polyphonePicker.value.visible = false;
};

const renderRawText = (value: string) => {
  let html = '';
  let index = 0;
  const tokenRegex =
    /<pause\s+ms="(\d+)"\s*\/>|<speed\s+rate="([^"]+)">([\s\S]*?)<\/speed>|<reread>([\s\S]*?)<\/reread>|<number\s+mode="([^"]+)">([\s\S]*?)<\/number>|<voice\s+voice_id="([^"]+)"\s+voice_name="([^"]+)"(?:\s+voice_avatar="([^"]*)")?>([\s\S]*?)<\/voice>|<polyphone\s+pronunciation="([^"]+)">([\s\S]*?)<\/polyphone>|<sound\s+effect="([^"]+)"\s*\/>/g;

  for (const match of value.matchAll(tokenRegex)) {
    const matchIndex = match.index ?? 0;
    html += escapeHtml(value.slice(index, matchIndex)).replace(/\n/g, '<br>');

    const raw = match[0];
    const start = matchIndex;
    const end = matchIndex + raw.length;

    if (match[1]) {
      html += buildMarkerChip('marker-chip--pause', start, end, raw, `<span class="marker-pill">${t('pause.title')}</span><span class="marker-text">${match[1]}ms</span>`);
    } else if (match[2] && match[3] !== undefined) {
      html += buildMarkerChip('marker-chip--speed', start, end, raw, `<span class="marker-pill">${t('speed.title')}</span><span class="marker-meta">${escapeHtml(match[2])}x</span><span class="marker-text">${escapeHtml(match[3])}</span>`);
    } else if (match[4] !== undefined) {
      html += buildMarkerChip('marker-chip--reread', start, end, raw, `<span class="marker-pill">${t('toolbar.reread')}</span><span class="marker-text">${escapeHtml(match[4])}</span>`);
    } else if (match[5] && match[6] !== undefined) {
      html += buildMarkerChip('marker-chip--number', start, end, raw, `<span class="marker-pill">${t('numberReading.title')}</span><span class="marker-meta">${escapeHtml(match[5])}</span><span class="marker-text">${escapeHtml(match[6])}</span>`);
    } else if (match[7] && match[8] !== undefined && match[10] !== undefined) {
      html += buildMarkerChip('marker-chip--voice', start, end, raw, `<span class="marker-voice-head"><span class="marker-avatar marker-avatar--voice">${escapeHtml(match[8].charAt(0))}</span><span class="marker-voice-badge">${escapeHtml(match[8])}</span></span><span class="marker-voice-text">${escapeHtml(match[10])}</span>`);
    } else if (match[11] && match[12] !== undefined) {
      html += buildMarkerChip('marker-chip--polyphone', start, end, raw, `<span class="marker-pill">${t('toolbar.polyphonic')}</span><span class="marker-polyphone-char">${escapeHtml(match[12])}</span><span class="marker-polyphone-pron">${escapeHtml(getToneMark(match[11]))}</span>`);
    } else if (match[13]) {
      const effectLabel = getSoundEffectLabel(match[13]);
      html += buildMarkerChip('marker-chip--sound', start, end, raw, `<span class="marker-pill">${t('soundEffect.title')}</span><span class="marker-text">${escapeHtml(effectLabel)}</span>`);
    }

    index = matchIndex + match[0].length;
  }

  html += escapeHtml(value.slice(index)).replace(/\n/g, '<br>');
  return html;
};

const decodeRawAttr = (value: string | null) =>
  (value || '').replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

const readRawTextFromNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeName === 'BR') return '\n';
  if (node instanceof HTMLElement) {
    if (node.dataset.raw) return decodeRawAttr(node.dataset.raw);
    return Array.from(node.childNodes).map(readRawTextFromNode).join('');
  }
  return '';
};

const getRawLength = (node: Node) => readRawTextFromNode(node).length;

const getOffsetWithin = (root: Node, targetNode: Node, targetOffset: number): number => {
  let total = 0;

  const walk = (node: Node): boolean => {
    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += targetOffset;
      } else {
        const children = Array.from(node.childNodes);
        for (let i = 0; i < targetOffset; i += 1) total += getRawLength(children[i]);
      }
      return true;
    }

    if (node instanceof HTMLElement && node.dataset.raw) {
      total += decodeRawAttr(node.dataset.raw).length;
      return false;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent?.length || 0;
      return false;
    }

    if (node.nodeName === 'BR') {
      total += 1;
      return false;
    }

    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }

    return false;
  };

  walk(root);
  return total;
};

const getSelectionOffsets = () => {
  const editor = editorRef.value;
  const selection = window.getSelection();
  if (!editor || !selection || selection.rangeCount === 0) {
    return { start: selectionStart.value, end: selectionEnd.value };
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
    return { start: selectionStart.value, end: selectionEnd.value };
  }

  return {
    start: getOffsetWithin(editor, range.startContainer, range.startOffset),
    end: getOffsetWithin(editor, range.endContainer, range.endOffset),
  };
};

const findDomPosition = (root: Node, rawOffset: number): { node: Node; offset: number } => {
  let remaining = rawOffset;

  const walk = (node: Node): { node: Node; offset: number } | null => {
    if (node instanceof HTMLElement && node.dataset.raw) {
      const raw = decodeRawAttr(node.dataset.raw);
      if (remaining <= raw.length) {
        const parent = node.parentNode ?? root;
        const childIndex = Array.from(parent.childNodes).indexOf(node);
        return { node: parent, offset: remaining === 0 ? childIndex : childIndex + 1 };
      }
      remaining -= raw.length;
      return null;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      return null;
    }

    if (node.nodeName === 'BR') {
      if (remaining <= 1) {
        const parent = node.parentNode ?? root;
        const childIndex = Array.from(parent.childNodes).indexOf(node);
        return { node: parent, offset: childIndex + 1 };
      }
      remaining -= 1;
      return null;
    }

    for (const child of Array.from(node.childNodes)) {
      const result = walk(child);
      if (result) return result;
    }
    return null;
  };

  return walk(root) || { node: root, offset: root.childNodes.length };
};

const restoreSelection = (start: number, end = start) => {
  const editor = editorRef.value;
  const selection = window.getSelection();
  if (!editor || !selection) return;

  const startPos = findDomPosition(editor, start);
  const endPos = findDomPosition(editor, end);
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  selection.removeAllRanges();
  selection.addRange(range);
};

const renderEditor = (rawText: string, caretOffset = selectionStart.value) => {
  if (!editorRef.value) return;
  editorRef.value.innerHTML = renderRawText(rawText);
  nextTick(() => restoreSelection(caretOffset, caretOffset));
};

const updateSelectionState = () => {
  const offsets = getSelectionOffsets();
  selectionStart.value = offsets.start;
  selectionEnd.value = offsets.end;
  appStore.setEditorSelection(offsets);
  if (offsets.end > offsets.start) {
    lastExpandedSelection.value = offsets;
  }
};

const getStableSelectionRange = () => {
  if (selectionEnd.value > selectionStart.value) {
    return { start: selectionStart.value, end: selectionEnd.value };
  }
  return lastExpandedSelection.value;
};

const replaceTextRange = (start: number, end: number, nextText: string, nextCaret = start + nextText.length) => {
  closePolyphonePicker();
  const updated = appStore.text.slice(0, start) + nextText + appStore.text.slice(end);
  appStore.setText(updated);
  selectionStart.value = nextCaret;
  selectionEnd.value = nextCaret;
  lastExpandedSelection.value = null;
  appStore.setEditorSelection({ start: nextCaret, end: nextCaret });
  appStore.clearLastExpandedSelection();
  nextTick(() => renderEditor(updated, nextCaret));
};

const getSelectionAnchor = () => {
  const selection = window.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const rect = range?.getBoundingClientRect();
  if (rect && (rect.width || rect.height)) {
    return { x: rect.left + rect.width / 2, y: rect.bottom + 8 };
  }

  const editorRect = editorRef.value?.getBoundingClientRect();
  return {
    x: (editorRect?.left || 0) + 120,
    y: (editorRect?.top || 0) + 56,
  };
};

const openPolyphonePicker = (options: {
  start: number;
  end: number;
  char: string;
  options: string[];
  x: number;
  y: number;
  currentPronunciation?: string;
}) => {
  polyphonePicker.value = {
    visible: true,
    start: options.start,
    end: options.end,
    char: options.char,
    options: options.options,
    x: options.x,
    y: options.y,
    currentPronunciation: options.currentPronunciation || '',
  };
};

const emitToolbarPolyphoneData = (options: {
  start: number;
  end: number;
  char: string;
  options: string[];
  currentPronunciation?: string;
}) => {
  document.dispatchEvent(
    new CustomEvent('toolbar-polyphone-data', {
      detail: {
        start: options.start,
        end: options.end,
        char: options.char,
        options: options.options,
        currentPronunciation: options.currentPronunciation || '',
      },
    })
  );
};

const requestVoiceWrapForSelection = () => {
  updateSelectionState();

  const range = getStableSelectionRange();
  if (!range) {
    window.alert(t('toast.selectTextForVoice'));
    return;
  }

  appStore.openVoiceWrapSelector({
    start: range.start,
    end: range.end,
  });
};

const requestPolyphoneForSelection = () => {
  updateSelectionState();

  const range = getStableSelectionRange();
  if (!range) {
    window.alert(t('toast.selectChar'));
    return;
  }

  if (range.end - range.start !== 1) {
    window.alert(t('toast.singleCharOnly'));
    return;
  }

  const selected = appStore.text.slice(range.start, range.end);
  if (!isChineseChar(selected)) {
    window.alert(t('toast.selectChineseChar'));
    return;
  }

  const options = getPolyphoneOptions(selected);
  if (options.length <= 1) {
    window.alert(t('toast.notPolyphone'));
    return;
  }

  const anchor = getSelectionAnchor();
  openPolyphonePicker({
    start: range.start,
    end: range.end,
    char: selected,
    options,
    x: anchor.x,
    y: anchor.y,
  });
};

const requestToolbarPolyphoneForSelection = () => {
  updateSelectionState();

  const range = getStableSelectionRange();
  if (!range) {
    window.alert(t('toast.selectChar'));
    return;
  }

  if (range.end - range.start !== 1) {
    window.alert(t('toast.singleCharOnly'));
    return;
  }

  const selected = appStore.text.slice(range.start, range.end);
  if (!isChineseChar(selected)) {
    window.alert(t('toast.selectChineseChar'));
    return;
  }

  const options = getPolyphoneOptions(selected);
  if (options.length <= 1) {
    window.alert(t('toast.notPolyphone'));
    return;
  }

  emitToolbarPolyphoneData({
    start: range.start,
    end: range.end,
    char: selected,
    options,
  });
};

const applyPolyphonePronunciation = (pronunciation: string) => {
  const { start, end, char } = polyphonePicker.value;
  replaceTextRange(start, end, `<polyphone pronunciation="${pronunciation}">${char}</polyphone>`);
};

const handleEditorCommand = (event: Event) => {
  const detail = (event as CustomEvent<EditorCommandDetail>).detail;
  updateSelectionState();

  if (detail.type === 'insertPause') {
    const insertAt = selectionStart.value === selectionEnd.value ? selectionStart.value : selectionEnd.value;
    replaceTextRange(insertAt, insertAt, `<pause ms="${detail.ms}"/>`, insertAt);
    return;
  }

  if (detail.type === 'wrapSpeed') {
    if (selectionStart.value === selectionEnd.value) return window.alert(t('toast.selectTextForSpeed'));
    const selected = appStore.text.slice(selectionStart.value, selectionEnd.value);
    replaceTextRange(selectionStart.value, selectionEnd.value, `<speed rate="${detail.rate}">${selected}</speed>`);
    return;
  }

  if (detail.type === 'wrapReread') {
    if (selectionStart.value === selectionEnd.value) return window.alert(t('toast.selectTextForReread'));
    const selected = appStore.text.slice(selectionStart.value, selectionEnd.value);
    replaceTextRange(selectionStart.value, selectionEnd.value, `<reread>${selected}</reread>`);
    return;
  }

  if (detail.type === 'wrapNumber') {
    if (selectionStart.value === selectionEnd.value) return window.alert(t('toast.selectNumber'));
    const selected = appStore.text.slice(selectionStart.value, selectionEnd.value);
    replaceTextRange(selectionStart.value, selectionEnd.value, `<number mode="${detail.mode}">${selected}</number>`);
    return;
  }

  if (detail.type === 'wrapVoice') {
    const selected = appStore.text.slice(detail.start, detail.end);
    if (!selected) return window.alert(t('toast.selectTextForVoice'));
    replaceTextRange(detail.start, detail.end, `<voice voice_id="${detail.voiceId}" voice_name="${detail.voiceName}" voice_avatar="${detail.voiceAvatar || ''}">${selected}</voice>`);
    return;
  }

  if (detail.type === 'updateVoiceMarker') {
    const raw = appStore.text.slice(detail.start, detail.end);
    const content = raw.match(/<voice\s+[^>]*>([\s\S]*?)<\/voice>/)?.[1] ?? '';
    replaceTextRange(detail.start, detail.end, `<voice voice_id="${detail.voiceId}" voice_name="${detail.voiceName}" voice_avatar="${detail.voiceAvatar || ''}">${content}</voice>`);
    return;
  }

  if (detail.type === 'requestVoiceWrap') {
    requestVoiceWrapForSelection();
    return;
  }

  if (detail.type === 'requestPolyphone') {
    requestPolyphoneForSelection();
    return;
  }

  if (detail.type === 'requestToolbarPolyphone') {
    requestToolbarPolyphoneForSelection();
    return;
  }

  if (detail.type === 'applyPolyphoneFromToolbar') {
    replaceTextRange(detail.start, detail.end, `<polyphone pronunciation="${detail.pronunciation}">${detail.char}</polyphone>`);
    return;
  }

  if (detail.type === 'insertSoundEffect') {
    replaceTextRange(selectionStart.value, selectionEnd.value, `<sound effect="${detail.effect}"/>`);
  }
};

const handleInput = () => {
  if (!editorRef.value) return;
  closePolyphonePicker();
  const rawText = Array.from(editorRef.value.childNodes).map(readRawTextFromNode).join('');
  const offsets = getSelectionOffsets();
  selectionStart.value = offsets.start;
  selectionEnd.value = offsets.end;
  appStore.setText(rawText);
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const pastedText = event.clipboardData?.getData('text/plain') || '';
  if (!pastedText) return;

  updateSelectionState();
  const currentLength = appStore.charCount - (selectionEnd.value - selectionStart.value);
  const allowedLength = appStore.maxLength - currentLength;
  replaceTextRange(selectionStart.value, selectionEnd.value, pastedText.slice(0, allowedLength));
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && polyphonePicker.value.visible) {
    closePolyphonePicker();
    return;
  }

  if (!(event.ctrlKey || event.metaKey)) return;
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault();
    closePolyphonePicker();
    appStore.consumePendingVoiceWrap();
    appStore.consumePendingVoiceEdit();
    event.shiftKey ? appStore.redo() : appStore.undo();
    nextTick(() => renderEditor(appStore.text, Math.min(selectionStart.value, appStore.text.length)));
  }
  if (event.key.toLowerCase() === 'y') {
    event.preventDefault();
    closePolyphonePicker();
    appStore.consumePendingVoiceWrap();
    appStore.consumePendingVoiceEdit();
    appStore.redo();
    nextTick(() => renderEditor(appStore.text, Math.min(selectionStart.value, appStore.text.length)));
  }
};

const handleMarkerRemoval = (event: MouseEvent) => {
  const removeButton = (event.target as HTMLElement | null)?.closest('.marker-remove') as HTMLElement | null;
  if (!removeButton) return;
  event.preventDefault();
  event.stopPropagation();
  const start = Number(removeButton.dataset.start);
  const end = Number(removeButton.dataset.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;

  const chip = removeButton.closest('.marker-chip') as HTMLElement | null;
  const raw = chip?.dataset.raw ? decodeRawAttr(chip.dataset.raw) : '';

  if (raw.startsWith('<pause') || raw.startsWith('<sound')) {
    replaceTextRange(start, end, '', start);
    return;
  }

  const wrappedContent =
    raw.match(/^<speed\s+rate="[^"]+">([\s\S]*?)<\/speed>$/)?.[1] ??
    raw.match(/^<reread>([\s\S]*?)<\/reread>$/)?.[1] ??
    raw.match(/^<number\s+mode="[^"]+">([\s\S]*?)<\/number>$/)?.[1] ??
    raw.match(/^<voice\s+[^>]*>([\s\S]*?)<\/voice>$/)?.[1] ??
    raw.match(/^<polyphone\s+pronunciation="[^"]+">([\s\S]*?)<\/polyphone>$/)?.[1];

  if (wrappedContent !== undefined) {
    replaceTextRange(start, end, wrappedContent, start + wrappedContent.length);
    return;
  }

  replaceTextRange(start, end, '', start);
};

const handleMarkerEdit = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target || target.closest('.marker-remove')) return;

  const chip = target.closest('.marker-chip') as HTMLElement | null;
  if (!chip?.dataset.raw) return;

  const start = Number(chip.dataset.start);
  const end = Number(chip.dataset.end);
  const raw = decodeRawAttr(chip.dataset.raw);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;

  if (raw.startsWith('<pause')) {
    const currentMs = raw.match(/ms="(\d+)"/)?.[1] ?? '500';
    const nextMs = window.prompt(t('pause.title'), currentMs);
    if (!nextMs) return;
    replaceTextRange(start, end, `<pause ms="${nextMs}"/>`);
    return;
  }

  if (raw.startsWith('<speed')) {
    const currentRate = raw.match(/rate="([^"]+)"/)?.[1] ?? '1.0';
    const selected = raw.match(/<speed\s+rate="[^"]+">([\s\S]*?)<\/speed>/)?.[1] ?? '';
    const nextRate = window.prompt(t('speed.title'), currentRate);
    if (!nextRate) return;
    replaceTextRange(start, end, `<speed rate="${nextRate}">${selected}</speed>`);
    return;
  }

  if (raw.startsWith('<number')) {
    const currentMode = raw.match(/mode="([^"]+)"/)?.[1] ?? 'cardinal';
    const selected = raw.match(/<number\s+mode="[^"]+">([\s\S]*?)<\/number>/)?.[1] ?? '';
    const nextMode = window.prompt(t('numberReading.title'), currentMode);
    if (!nextMode) return;
    replaceTextRange(start, end, `<number mode="${nextMode}">${selected}</number>`);
    return;
  }

  if (raw.startsWith('<voice')) {
    const currentVoiceId = raw.match(/voice_id="([^"]+)"/)?.[1] ?? appStore.currentVoice.id;
    appStore.openVoiceEditSelector({ start, end, voiceId: currentVoiceId });
    return;
  }

  if (raw.startsWith('<polyphone')) {
    const currentPronunciation = raw.match(/pronunciation="([^"]+)"/)?.[1] ?? '';
    const selected = raw.match(/<polyphone\s+pronunciation="[^"]+">([\s\S]*?)<\/polyphone>/)?.[1] ?? '';
    const options = getPolyphoneOptions(selected);

    if (options.length <= 1) {
      window.alert(t('toast.notPolyphone'));
      return;
    }

    const rect = chip.getBoundingClientRect();
    openPolyphonePicker({
      start,
      end,
      char: selected,
      options,
      currentPronunciation,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    return;
  }

  if (raw.startsWith('<sound')) {
    const currentEffect = raw.match(/effect="([^"]+)"/)?.[1] ?? '';
    const nextEffect = window.prompt(t('soundEffect.title'), currentEffect);
    if (!nextEffect) return;
    replaceTextRange(start, end, `<sound effect="${nextEffect}"/>`);
  }
};

const handleDocumentPointerDown = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!polyphonePicker.value.visible) return;
  if (target?.closest('.polyphone-picker')) return;
  closePolyphonePicker();
};

onMounted(() => {
  renderEditor(appStore.text, appStore.text.length);
  document.addEventListener('voice-editor-command', handleEditorCommand as EventListener);
  document.addEventListener('selectionchange', updateSelectionState);
  document.addEventListener('mousedown', handleDocumentPointerDown);
  editorRef.value?.addEventListener('click', handleMarkerRemoval);
  editorRef.value?.addEventListener('click', handleMarkerEdit);
});

onBeforeUnmount(() => {
  if (historyTimer.value !== null) {
    window.clearTimeout(historyTimer.value);
  }
  document.removeEventListener('voice-editor-command', handleEditorCommand as EventListener);
  document.removeEventListener('selectionchange', updateSelectionState);
  document.removeEventListener('mousedown', handleDocumentPointerDown);
  editorRef.value?.removeEventListener('click', handleMarkerRemoval);
  editorRef.value?.removeEventListener('click', handleMarkerEdit);
});

watch(
  () => appStore.text,
  (newText) => {
    if (!editorRef.value) return;
    const currentRaw = Array.from(editorRef.value.childNodes).map(readRawTextFromNode).join('');
    if (currentRaw !== newText) renderEditor(newText, Math.min(selectionStart.value, newText.length));
  }
);

watch(
  () => [appStore.text, appStore.historyIndex] as const,
  ([newText, historyIndex]) => {
    const isUndoRedo = historyIndex !== previousHistoryIndex.value;
    previousHistoryIndex.value = historyIndex;

    if (historyTimer.value !== null) {
      window.clearTimeout(historyTimer.value);
      historyTimer.value = null;
    }

    if (isUndoRedo) return;

    historyTimer.value = window.setTimeout(() => {
      appStore.addToHistory(newText);
      historyTimer.value = null;
    }, 800);
  },
  { flush: 'post' }
);
</script>

<style scoped>
.voice-editor {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 0;
  background: linear-gradient(90deg, #fdf4ee 0%, #fdf6f2 50%, #fff8e9 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  transform-origin: top left;
}

.toolbar-section,
.status-bar-section {
  flex-shrink: 0;
  min-width: 0;
  max-width: 100%;
}

.toolbar-section {
  position: relative;
  z-index: 5;
  overflow: visible;
}

.status-bar-section {
  position: relative;
  z-index: 2;
  background: linear-gradient(90deg, #fdf4ee 0%, #fdf6f2 50%, #fff8e9 100%);
  overflow: hidden;
}

.main-section {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 262px;
  gap: 16px;
  padding: 22px 18px 12px;
  align-items: stretch;
  justify-content: stretch;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
}

.main-section::before {
  display: none;
}

.text-area-wrapper {
  position: relative;
  width: auto;
  max-width: none;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-self: stretch;
}

.text-editor {
  width: 100%;
  flex: 1 1 auto;
  min-height: 420px;
  max-height: none;
  padding: 28px 24px;
  background: #fff;
  border: 1px solid #f7dcc8;
  border-radius: 28px;
  box-shadow: 0 18px 42px rgba(245, 158, 11, 0.07);
  font-size: 16px;
  line-height: 2.6;
  outline: none;
  overflow-y: auto;
  color: #1f2937;
}

.text-editor:focus {
  border-color: #f9b98c;
}

.text-editor:empty::before {
  content: attr(data-placeholder);
  color: #b5bcc7;
  pointer-events: none;
}

.polyphone-picker {
  position: fixed;
  z-index: 40;
  min-width: 168px;
  max-width: 220px;
  padding: 8px;
  display: grid;
  gap: 6px;
  border: 1px solid #f1d8c5;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  transform: translateX(-50%);
}

.polyphone-picker__title {
  padding: 2px 6px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.polyphone-picker__option {
  height: 34px;
  padding: 0 12px;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  background: #fff;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
}

.polyphone-picker__option:hover,
.polyphone-picker__option--active {
  border-color: #f7b58b;
  background: #fff7ef;
  color: #c2410c;
}

.polyphone-picker__raw {
  font-size: 11px;
  color: #94a3b8;
}

.voice-card-wrapper {
  width: 262px;
  max-width: 262px;
  flex-shrink: 0;
  padding-top: 2px;
  padding-right: 0;
  align-self: flex-start;
  overflow: visible;
  justify-self: end;
}

:deep(.marker-chip) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 6px 0 1px;
  padding: 3px 8px 3px 5px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
}

:deep(.marker-pill) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  font-size: 10px;
  font-weight: 700;
}

:deep(.marker-text) {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.marker-meta) {
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  font-weight: 700;
}

:deep(.marker-chip--pause) {
  border-color: #fdba74;
  background: #ffedd5;
  color: #c2410c;
}

:deep(.marker-chip--speed) {
  border-color: #7dd3fc;
  background: #e0f2fe;
  color: #0369a1;
}

:deep(.marker-chip--reread) {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}

:deep(.marker-chip--number) {
  border-color: #c4b5fd;
  background: #ede9fe;
  color: #6d28d9;
}

:deep(.marker-chip--voice) {
  border-color: #fed7aa;
  background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
  color: #7c2d12;
  padding: 4px 10px 4px 5px;
  gap: 8px;
  border-radius: 16px;
  box-shadow: 0 6px 16px rgba(249, 115, 22, 0.12);
  cursor: pointer;
}

:deep(.marker-chip--polyphone) {
  border-color: #93c5fd;
  background: #dbeafe;
  color: #1d4ed8;
}

:deep(.marker-chip--sound) {
  border-color: #f9a8d4;
  background: #fce7f3;
  color: #be185d;
}

:deep(.marker-avatar) {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #84cc16;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}

:deep(.marker-avatar--voice) {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.24);
  flex-shrink: 0;
}

:deep(.marker-voice-head) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 2px;
}

:deep(.marker-voice-badge) {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #9a3412;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

:deep(.marker-voice-name),
:deep(.marker-polyphone-char) {
  font-weight: 700;
}

:deep(.marker-voice-text) {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #7c2d12;
  font-weight: 600;
  border-bottom: 1px solid transparent;
}

:deep(.marker-chip--voice:hover .marker-voice-text) {
  border-bottom-color: rgba(194, 65, 12, 0.28);
}

:deep(.marker-polyphone-pron) {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
}

:deep(.marker-remove) {
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  color: currentColor;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  line-height: 16px;
  text-align: center;
}

@media (max-width: 1024px) {
  .main-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .main-section::before {
    display: none;
  }

  .text-area-wrapper,
  .voice-card-wrapper {
    width: 100%;
    max-width: none;
  }
}

@media (min-width: 1025px) and (max-width: 1600px) {
  .editor-layout {
    zoom: 0.88;
    width: calc(100% / 0.88);
  }
}
</style>



