import { estimateTaggedDuration } from '../utils/textWorkflow';

export interface VoiceInfo {
  id: string;
  name: string;
  gender: string;
  language: string;
  description: string;
}

export interface TtsConfig {
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  bgmPath?: string | null;
  bgmVolume?: number;
}

export interface TtsProgress {
  current: number;
  total: number;
  percentage: number;
  segmentText: string;
}

export type PreviewState = 'idle' | 'playing' | 'paused';
type ProgressCallback = (progress: TtsProgress) => void;

export interface PreviewHandlers {
  onProgress?: ProgressCallback;
  onStateChange?: (state: PreviewState) => void;
}

const CUSTOM_SOUND_KEY = 'lingjing_custom_sound_effects';
const CUSTOM_BGM_KEY = 'lingjing_custom_bgm_tracks';
const BUILTIN_SOUND_EFFECT_IDS = new Set([
  'applause',
  'knock',
  'phone-ring',
  'doorbell',
  'notification',
  'laugh',
  'warning',
  'gasp',
  'success',
]);
const LEGACY_SOUND_EFFECT_NAME_MAP: Record<string, string> = {
  '\u638c\u58f0': 'applause',
  '\u6572\u95e8': 'knock',
  '\u7535\u8bdd\u94c3\u58f0': 'phone-ring',
  '\u95e8\u94c3': 'doorbell',
  '\u901a\u77e5': 'notification',
  '\u7b11\u58f0': 'laugh',
  '\u8b66\u544a': 'warning',
  '\u6b22\u547c': 'applause',
  '\u8f6c\u573a\u97f3': 'notification',
};

const CURATED_VOICE_LANG: Record<string, string> = {
  zhiwei: 'zh-CN',
  xiaoyu: 'zh-CN',
  xiaofeng: 'zh-CN',
  xiaomei: 'zh-CN',
  yunjian: 'zh-CN',
  yunxia: 'zh-CN',
  xiaobei: 'zh-CN',
  xiaoni: 'zh-CN',
  wanlong: 'zh-HK',
  hiugaai: 'zh-HK',
  hiumaan: 'zh-HK',
  yunjhe: 'zh-TW',
  hsiaochen: 'zh-TW',
  hsiaoyu: 'zh-TW',
};

const CURATED_VOICE_NAME_HINTS: Record<string, string[]> = {
  zhiwei: ['Yunxi', '浜戝笇', 'Kangkang', 'Dongdong'],
  xiaoyu: ['Xiaoxiao', 'Yaoyao', 'Huihui', '鏅撴檽'],
  xiaofeng: ['Yunyang', '浜戦噹'],
  xiaomei: ['Xiaoyi', '鏅撲紛'],
  yunjian: ['Yunjian', '浜戝仴'],
  yunxia: ['Yunxia', '浜戦湠'],
  xiaobei: ['Xiaobei', '涓滃寳', 'Liaoning'],
  xiaoni: ['Xiaoni', '闄曡タ', 'Shaanxi'],
  wanlong: ['WanLung', 'Wanlong', 'Yunlong', '浜戦緳'],
  hiugaai: ['HiuGaai', 'Hiugaai', 'Gaai'],
  hiumaan: ['HiuMaan', 'Hiumaan', 'Maan'],
  yunjhe: ['YunJhe', 'Yunjhe', '浜戝摬'],
  hsiaochen: ['HsiaoChen', 'Hsiaochen', '鏅撹嚮'],
  hsiaoyu: ['HsiaoYu', 'Hsiaoyu', '鏅撹'],
};

const CURATED_VOICE_ORDER: string[] = [
  'zhiwei',
  'xiaoyu',
  'xiaofeng',
  'xiaomei',
  'yunjian',
  'yunxia',
  'xiaobei',
  'xiaoni',
  'wanlong',
  'hiugaai',
  'hiumaan',
  'yunjhe',
  'hsiaochen',
  'hsiaoyu',
];

function normalizeLangTag(lang: string): string {
  return lang.replace(/_/g, '-').toLowerCase();
}

function voiceMatchesLang(voice: SpeechSynthesisVoice, target: string): boolean {
  const source = normalizeLangTag(voice.lang || '');
  const expected = normalizeLangTag(target);
  return source === expected || source.startsWith(`${expected}-`) || (expected.length >= 2 && source.startsWith(expected.slice(0, 2)));
}

async function ensureVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length > 0) return voices;

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', onChange);
      resolve();
    };
    const onChange = () => {
      if (synth.getVoices().length > 0) done();
    };
    synth.addEventListener('voiceschanged', onChange);
    window.setTimeout(done, 2000);
  });

  return synth.getVoices();
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
  }
  return hash;
}

export function resolveSpeechSynthesisVoice(voiceId: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const direct = voices.find((voice) => voice.voiceURI === voiceId || voice.name === voiceId);
  if (direct) return direct;

  const lang = CURATED_VOICE_LANG[voiceId] || 'zh-CN';
  const hints = CURATED_VOICE_NAME_HINTS[voiceId] || [];
  const pool = voices.filter((voice) => voiceMatchesLang(voice, lang));
  const candidates = pool.length > 0 ? pool : voices;

  for (const hint of hints) {
    const lowerHint = hint.toLowerCase();
    const found = candidates.find((voice) => voice.name.toLowerCase().includes(lowerHint));
    if (found) return found;
  }

  const orderIndex = CURATED_VOICE_ORDER.indexOf(voiceId);
  const slot = orderIndex >= 0 ? orderIndex : Math.abs(hashString(voiceId)) % candidates.length;
  const sorted = [...candidates].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  return sorted[slot % sorted.length] ?? candidates[0] ?? null;
}

export interface AssetMapItem {
  id?: string;
  name: string;
  url: string;
  duration?: number;
  size?: number;
}

function readAssetMaps(): { soundEffects: AssetMapItem[]; bgmTracks: AssetMapItem[] } {
  try {
    return {
      soundEffects: JSON.parse(localStorage.getItem(CUSTOM_SOUND_KEY) || '[]') as AssetMapItem[],
      bgmTracks: JSON.parse(localStorage.getItem(CUSTOM_BGM_KEY) || '[]') as AssetMapItem[],
    };
  } catch {
    return { soundEffects: [], bgmTracks: [] };
  }
}

function normalizeSoundEffectName(name: string): string {
  const trimmed = String(name || '').trim();
  return LEGACY_SOUND_EFFECT_NAME_MAP[trimmed] || trimmed;
}

function normalizeSoundEffectTags(text: string): string {
  return text.replace(/<sound\s+effect="([^"]+)"\s*\/>/g, (_, effectName) => {
    const normalized = normalizeSoundEffectName(effectName);
    return `<sound effect="${normalized}"/>`;
  });
}

function collectSoundEffectsFromText(text: string): string[] {
  const used = new Set<string>();
  for (const match of text.matchAll(/<sound\s+effect="([^"]+)"\s*\/>/g)) {
    if (match[1]) used.add(normalizeSoundEffectName(match[1]));
  }
  return Array.from(used);
}

function validateAssetIntegrity(text: string, config: TtsConfig) {
  const assetMaps = readAssetMaps();
  const usedSoundEffects = collectSoundEffectsFromText(text);

  const missingSoundEffects = usedSoundEffects.filter(
    (name) =>
      !BUILTIN_SOUND_EFFECT_IDS.has(name) &&
      !assetMaps.soundEffects.some((item) => (item.id === name || item.name === name) && Boolean(item.url))
  );

  const bgmPath = config.bgmPath?.trim();
  let missingBgm = false;
  if (bgmPath && !bgmPath.startsWith('http') && !bgmPath.startsWith('blob:')) {
    const isPreset = bgmPath.toLowerCase().endsWith('.mp3');
    const isMappedCustom = assetMaps.bgmTracks.some((item) => item.url === bgmPath || item.name === bgmPath);
    if (!isPreset && !isMappedCustom) missingBgm = true;
  }

  return {
    ok: missingSoundEffects.length === 0 && !missingBgm,
    missingSoundEffects,
    missingBgm,
    assetMaps,
    usedSoundEffects,
  };
}

class WebTtsService {
  private synth: SpeechSynthesis;
  private bgmAudio: HTMLAudioElement | null = null;
  private audioConfig: TtsConfig = {
    voice_id: 'zhiwei',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0,
  };
  private previewState: PreviewState = 'idle';
  private previewHandlers: PreviewHandlers | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private previewPromise: Promise<void> | null = null;
  private previewResolve: (() => void) | null = null;
  private previewReject: ((error: Error) => void) | null = null;
  private previewText = '';
  private previewCharIndex = 0;
  private previewVoices: SpeechSynthesisVoice[] = [];
  private previewSignature = '';
  private progressCallback: ProgressCallback | null = null;
  private previewSessionId = 0;
  private exportController: AbortController | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  private getPreviewPercentageForCharIndex(charIndex = this.previewCharIndex): number {
    return Math.max(0, Math.min(100, (charIndex / Math.max(this.previewText.length, 1)) * 100));
  }

  private stopBgmAudio() {
    if (!this.bgmAudio) return;
    this.bgmAudio.pause();
    this.bgmAudio.currentTime = 0;
    this.bgmAudio = null;
  }

  private syncBgmVolume() {
    if (!this.bgmAudio) return;
    this.bgmAudio.volume = Math.max(0, Math.min(1, this.audioConfig.bgmVolume ?? 0.3));
  }

  private async ensureBgmPlaying(progressPercentage = this.getPreviewPercentageForCharIndex()) {
    const bgmPath = this.audioConfig.bgmPath?.trim();
    if (!bgmPath) {
      this.stopBgmAudio();
      return;
    }

    if (!this.bgmAudio || this.bgmAudio.src !== new URL(bgmPath, window.location.href).href) {
      this.stopBgmAudio();
      this.bgmAudio = new Audio(bgmPath);
      this.bgmAudio.preload = 'auto';
      this.bgmAudio.loop = true;
    }

    this.syncBgmVolume();

    const applyCurrentTime = () => {
      if (!this.bgmAudio) return;
      if (!Number.isFinite(this.bgmAudio.duration) || this.bgmAudio.duration <= 0) return;
      const seekTime = (this.bgmAudio.duration * Math.max(0, Math.min(100, progressPercentage))) / 100;
      this.bgmAudio.currentTime = Math.min(this.bgmAudio.duration - 0.05, Math.max(0, seekTime));
    };

    if (this.bgmAudio.readyState >= 1) {
      applyCurrentTime();
    } else {
      this.bgmAudio.addEventListener('loadedmetadata', applyCurrentTime, { once: true });
    }

    try {
      await this.bgmAudio.play();
    } catch (error) {
      console.warn('bgm preview play failed', error);
    }
  }

  public getVoiceList(): VoiceInfo[] {
    return this.synth.getVoices().map((voice) => ({
      id: voice.voiceURI,
      name: voice.name,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male',
      language: voice.lang,
      description: voice.name,
    }));
  }

  public setAudioConfig(config: Partial<TtsConfig>) {
    this.audioConfig = { ...this.audioConfig, ...config };
    if ('bgmVolume' in config) {
      this.syncBgmVolume();
    }
    if ('bgmPath' in config && this.previewState === 'playing') {
      void this.ensureBgmPlaying();
    }
    if ('bgmPath' in config && !this.audioConfig.bgmPath) {
      this.stopBgmAudio();
    }
  }

  public getAudioConfig(): TtsConfig {
    return { ...this.audioConfig };
  }

  public getPreviewState(): PreviewState {
    if (this.synth.paused || this.previewState === 'paused') return 'paused';
    if ((this.synth.speaking && this.currentUtterance) || this.previewState === 'playing') return 'playing';
    return 'idle';
  }

  public getPreviewText(): string {
    return this.previewText;
  }

  public getPreviewSignature(): string {
    return this.previewSignature;
  }

  private buildPreviewSignature(text: string): string {
    return JSON.stringify({
      text,
      voice_id: this.audioConfig.voice_id,
      speed: this.audioConfig.speed,
      pitch: this.audioConfig.pitch,
      volume: this.audioConfig.volume,
      bgmPath: this.audioConfig.bgmPath ?? null,
      bgmVolume: this.audioConfig.bgmVolume ?? null,
    });
  }

  private updatePreviewState(state: PreviewState) {
    this.previewState = state;
    this.previewHandlers?.onStateChange?.(state);
  }

  private emitPreviewProgress() {
    const percentage = Math.min(100, Math.max(0, Math.round((this.previewCharIndex / Math.max(this.previewText.length, 1)) * 100)));
    this.previewHandlers?.onProgress?.({
      current: 0,
      total: 1,
      percentage,
      segmentText: this.previewText.substring(this.previewCharIndex, this.previewCharIndex + 50),
    });
  }

  private createPreviewPromise() {
    this.previewSessionId += 1;
    this.previewPromise = new Promise((resolve, reject) => {
      this.previewResolve = resolve;
      this.previewReject = reject;
    });
    return this.previewPromise;
  }

  private clearPreviewSession() {
    this.currentUtterance = null;
    this.previewHandlers = null;
    this.previewPromise = null;
    this.previewResolve = null;
    this.previewReject = null;
    this.previewText = '';
    this.previewCharIndex = 0;
    this.previewVoices = [];
    this.previewSignature = '';
    this.previewState = 'idle';
    this.stopBgmAudio();
  }

  private finishPreview() {
    this.previewHandlers?.onProgress?.({
      current: 1,
      total: 1,
      percentage: 100,
      segmentText: '',
    });
    this.updatePreviewState('idle');
    const resolve = this.previewResolve;
    this.clearPreviewSession();
    resolve?.();
  }

  private failPreview(error: Error) {
    const reject = this.previewReject;
    this.clearPreviewSession();
    reject?.(error);
  }

  private speakPreviewFromIndex(charIndex: number) {
    const sessionId = this.previewSessionId;
    const safeIndex = Math.max(0, Math.min(charIndex, Math.max(this.previewText.length - 1, 0)));
    const spokenText = this.previewText.slice(safeIndex);

    if (!spokenText.trim()) {
      this.finishPreview();
      return this.previewPromise ?? Promise.resolve();
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = this.audioConfig.speed;
    utterance.pitch = this.audioConfig.pitch;
    utterance.volume = this.audioConfig.volume;

    const selectedVoice = resolveSpeechSynthesisVoice(this.audioConfig.voice_id, this.previewVoices);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      if (sessionId !== this.previewSessionId) return;
      this.previewCharIndex = safeIndex;
      this.updatePreviewState('playing');
      this.emitPreviewProgress();
      void this.ensureBgmPlaying(this.getPreviewPercentageForCharIndex(safeIndex));
    };

    utterance.onpause = () => {
      if (sessionId !== this.previewSessionId) return;
      this.bgmAudio?.pause();
      this.updatePreviewState('paused');
    };

    utterance.onresume = () => {
      if (sessionId !== this.previewSessionId) return;
      this.updatePreviewState('playing');
      void this.ensureBgmPlaying();
    };

    utterance.onboundary = (event) => {
      if (sessionId !== this.previewSessionId) return;
      if (typeof event.charIndex !== 'number') return;
      this.previewCharIndex = safeIndex + event.charIndex;
      this.emitPreviewProgress();
    };

    utterance.onend = () => {
      if (sessionId !== this.previewSessionId) return;
      this.finishPreview();
    };

    utterance.onerror = (event) => {
      if (sessionId !== this.previewSessionId) return;
      const error = String(event.error || '').toLowerCase();
      if (error === 'interrupted' || error === 'canceled' || error === 'cancelled') {
        if (this.previewState === 'paused') return;
        this.finishPreview();
        return;
      }
      this.failPreview(new Error(`鎾斁澶辫触: ${event.error}`));
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return this.previewPromise ?? Promise.resolve();
  }

  private restartPreviewFromIndex(charIndex: number, handlers?: PreviewHandlers) {
    const nextSessionId = this.previewSessionId + 1;
    if (this.synth.speaking || this.synth.paused) {
      this.previewSessionId = nextSessionId;
      this.synth.cancel();
    }

    this.previewHandlers = handlers || this.previewHandlers;
    this.previewCharIndex = Math.max(0, Math.min(charIndex, Math.max(this.previewText.length - 1, 0)));
    if (this.previewSessionId !== nextSessionId) {
      this.previewSessionId = nextSessionId;
    }
    this.previewPromise = new Promise((resolve, reject) => {
      this.previewResolve = resolve;
      this.previewReject = reject;
    });
    return this.speakPreviewFromIndex(this.previewCharIndex);
  }

  public async generateAudio(text: string, onProgress?: ProgressCallback): Promise<string> {
    if (!text.trim()) throw new Error('鏂囨湰涓嶈兘涓虹┖');

    const voices = await ensureVoicesLoaded();
    return new Promise((resolve, reject) => {
      this.synth.cancel();
      this.progressCallback = onProgress || null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.audioConfig.speed;
      utterance.pitch = this.audioConfig.pitch;
      utterance.volume = this.audioConfig.volume;

      const selectedVoice = resolveSpeechSynthesisVoice(this.audioConfig.voice_id, voices);
      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onstart = () => {
        this.progressCallback?.({ current: 0, total: 1, percentage: 0, segmentText: text.slice(0, 50) });
      };

      utterance.onboundary = (event) => {
        if (typeof event.charIndex !== 'number') return;
        const percentage = Math.min(100, Math.round((event.charIndex / Math.max(text.length, 1)) * 100));
        this.progressCallback?.({
          current: 0,
          total: 1,
          percentage,
          segmentText: text.substring(event.charIndex, event.charIndex + 50),
        });
      };

      utterance.onend = () => {
        this.progressCallback?.({ current: 1, total: 1, percentage: 100, segmentText: '' });
        resolve('web-tts-complete');
      };

      utterance.onerror = (event) => {
        const error = String(event.error || '').toLowerCase();
        if (error === 'interrupted' || error === 'canceled' || error === 'cancelled') {
          resolve('web-tts-complete');
          return;
        }
        reject(new Error(`TTS鐢熸垚澶辫触: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  public cancelGenerateAudio(): boolean {
    this.synth.cancel();
    this.currentUtterance = null;
    return true;
  }

  public cancelExportAudio(): boolean {
    if (!this.exportController) return false;
    this.exportController.abort();
    this.exportController = null;
    return true;
  }

  public async playPreview(text: string, handlers?: PreviewHandlers): Promise<void> {
    const signature = this.buildPreviewSignature(text);

    const canResume =
      this.currentUtterance !== null &&
      this.previewSignature === signature &&
      (this.synth.paused || this.previewState === 'paused');

    if (canResume) {
      this.previewHandlers = handlers || this.previewHandlers;
      this.synth.resume();
      this.updatePreviewState('playing');
      return this.previewPromise ?? Promise.resolve();
    }

    if (this.synth.speaking || this.synth.paused) {
      this.stopPreview();
    }

    this.previewHandlers = handlers || null;
    this.previewText = text;
    this.previewCharIndex = 0;
    this.previewSignature = signature;
    this.createPreviewPromise();
    void this.ensureBgmPlaying(0);
    const voices = await ensureVoicesLoaded();
    this.previewVoices = voices;
    return this.speakPreviewFromIndex(0);
  }

  public pausePreview(): void {
    if ((this.synth.speaking || this.previewState === 'playing') && !this.synth.paused) {
      this.synth.pause();
      this.bgmAudio?.pause();
      this.updatePreviewState('paused');
    }
  }

  public async resumePreview(): Promise<void> {
    if (!this.currentUtterance || (!this.synth.paused && this.previewState !== 'paused')) {
      return this.previewPromise ?? Promise.resolve();
    }

    const sessionId = this.previewSessionId;
    void this.ensureBgmPlaying();
    this.synth.resume();
    this.updatePreviewState('playing');

    window.setTimeout(() => {
      const sameSession = sessionId === this.previewSessionId;
      const resumeFailed =
        sameSession &&
        this.currentUtterance !== null &&
        this.previewState !== 'idle' &&
        (this.synth.paused || !this.synth.speaking);

      if (!resumeFailed) return;
      void this.restartPreviewFromIndex(this.previewCharIndex);
    }, 180);

    return this.previewPromise ?? Promise.resolve();
  }

  public async seekPreview(text: string, percentage: number, handlers?: PreviewHandlers): Promise<void> {
    const signature = this.buildPreviewSignature(text);
    const charIndex = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * Math.max(text.length - 1, 0));

    this.previewHandlers = handlers || null;
    this.previewText = text;
    this.previewCharIndex = charIndex;
    this.previewSignature = signature;
    void this.ensureBgmPlaying(percentage);
    const voices = await ensureVoicesLoaded();
    this.previewVoices = voices;
    return this.restartPreviewFromIndex(charIndex, handlers);
  }

  public stopPreview(): void {
    if (this.synth.speaking || this.synth.paused) {
      this.previewSessionId += 1;
      this.synth.cancel();
    }
    this.clearPreviewSession();
  }

  public async exportAudioByApi(text: string, config?: Partial<TtsConfig>): Promise<Blob> {
    const endpoint = String(import.meta.env.VITE_TTS_EXPORT_API || '/api/tts/export').trim();
    if (!endpoint) {
      throw new Error('Missing VITE_TTS_EXPORT_API; unable to export audio on the web.');
    }

    const finalConfig = { ...this.audioConfig, ...(config || {}) };
    const timeoutMs = Number(import.meta.env.VITE_TTS_EXPORT_API_TIMEOUT_MS || 120000);
    this.exportController?.abort();
    const controller = new AbortController();
    this.exportController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const token = localStorage.getItem('auth_token') || '';

    try {
      const validation = validateAssetIntegrity(text, finalConfig);
      const { assetMaps, usedSoundEffects } = validation;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { token } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          text,
          voice_id: finalConfig.voice_id,
          speed: finalConfig.speed,
          pitch: finalConfig.pitch,
          volume: finalConfig.volume,
          bgmPath: finalConfig.bgmPath ?? null,
          bgmVolume: finalConfig.bgmVolume ?? 0.3,
          format: 'mp3',
          usedSoundEffects,
          soundAssetMap: assetMaps.soundEffects,
          bgmAssetMap: assetMaps.bgmTracks,
          config: finalConfig,
        }),
      });

      if (!response.ok) throw new Error(`瀵煎嚭鎺ュ彛璋冪敤澶辫触: ${response.status}`);
      return await response.blob();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        if (controller.signal.aborted) {
          throw new Error('ExportCancelled');
        }
        throw new Error('瀵煎嚭瓒呮椂锛岃绋嶅悗閲嶈瘯');
      }
      throw error;
    } finally {
      if (this.exportController === controller) {
        this.exportController = null;
      }
      window.clearTimeout(timeoutId);
    }
  }
}

export const webTtsService = new WebTtsService();

export function getVoiceList(): VoiceInfo[] {
  return webTtsService.getVoiceList();
}

export function setAudioConfig(config: Partial<TtsConfig>): void {
  webTtsService.setAudioConfig(config);
}

export function getAudioConfig(): TtsConfig {
  return webTtsService.getAudioConfig();
}

export function getPreviewState(): PreviewState {
  return webTtsService.getPreviewState();
}

export function getPreviewText(): string {
  return webTtsService.getPreviewText();
}

export function getPreviewSignature(): string {
  return webTtsService.getPreviewSignature();
}

export async function generateAudio(text: string, onProgress?: ProgressCallback): Promise<string> {
  return webTtsService.generateAudio(text, onProgress);
}

export async function cancelGenerateAudio(): Promise<boolean> {
  return webTtsService.cancelGenerateAudio();
}

export async function cancelExportAudio(): Promise<boolean> {
  return webTtsService.cancelExportAudio();
}

export async function playPreview(text: string, handlers?: PreviewHandlers): Promise<void> {
  return webTtsService.playPreview(text, handlers);
}

export function pausePreview(): void {
  webTtsService.pausePreview();
}

export async function resumePreview(): Promise<void> {
  return webTtsService.resumePreview();
}

export async function seekPreview(text: string, percentage: number, handlers?: PreviewHandlers): Promise<void> {
  return webTtsService.seekPreview(text, percentage, handlers);
}

export function stopPreview(): void {
  webTtsService.stopPreview();
}

export async function exportAudioByApi(text: string, config?: Partial<TtsConfig>): Promise<Blob> {
  return webTtsService.exportAudioByApi(text, config);
}

export function validateExportAssets(text: string, config: TtsConfig) {
  return validateAssetIntegrity(text, config);
}

export function estimateDuration(text: string, speed = 1): number {
  return estimateTaggedDuration(text, speed);
}

