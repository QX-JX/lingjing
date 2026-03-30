import { pinyin } from 'pinyin-pro';

const SOUND_EFFECT_DURATIONS_MS: Record<string, number> = {
  applause: 2000,
  cheer: 1800,
  knock: 1000,
  ring: 2000,
  transition: 1200,
  laugh: 1500,
  gasp: 500,
  doorbell: 1000,
  'phone-ring': 2000,
  notification: 500,
  success: 1000,
  warning: 1000,
};

const REREAD_SPEED_FACTOR = 0.75;

const TONE_MAP: Record<string, string> = {
  a: 'āáǎàa',
  o: 'ōóǒòo',
  e: 'ēéěèe',
  i: 'īíǐìi',
  u: 'ūúǔùu',
  v: 'ǖǘǚǜü',
};

export function getPlainText(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

export function getTextCharCount(text: string, excludeWhitespace = false): number {
  const plainText = getPlainText(text);
  return excludeWhitespace ? plainText.replace(/\s/g, '').length : plainText.length;
}

export function getPauseDurationSeconds(text: string): number {
  let totalMs = 0;
  for (const match of text.matchAll(/<pause\s+ms=["'](\d+)["']\s*\/>/g)) {
    totalMs += Number(match[1] || 0);
  }
  return totalMs / 1000;
}

export function getSoundEffectDurationSeconds(text: string): number {
  let totalMs = 0;
  for (const match of text.matchAll(/<sound\s+effect=["']([^"']+)["']\s*\/>/g)) {
    totalMs += SOUND_EFFECT_DURATIONS_MS[match[1] || ''] || 1000;
  }
  return totalMs / 1000;
}

function calculateDurationWithSpeedSegments(text: string, defaultSpeed = 1): number {
  const segments: Array<{ text: string; speed: number }> = [];
  const speedRegex = /<speed\s+rate=["']([^"']+)["']>([\s\S]*?)<\/speed>/g;
  let lastIndex = 0;

  for (const match of text.matchAll(speedRegex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      const normalText = text.slice(lastIndex, index);
      if (normalText.trim()) {
        segments.push({ text: normalText, speed: defaultSpeed });
      }
    }

    segments.push({
      text: match[2] || '',
      speed: Number(match[1]) || defaultSpeed,
    });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({ text: remaining, speed: defaultSpeed });
    }
  }

  if (segments.length === 0) {
    segments.push({ text, speed: defaultSpeed });
  }

  return segments.reduce((total, segment) => {
    const segmentHasReread = /<reread>/.test(segment.text);
    const effectiveSpeed = Math.max((segmentHasReread ? segment.speed * REREAD_SPEED_FACTOR : segment.speed) || 1, 0.1);
    const charsPerSecond = (250 * effectiveSpeed) / 60;
    const voiceDuration = getTextCharCount(segment.text) / charsPerSecond;
    return total + voiceDuration + getPauseDurationSeconds(segment.text) + getSoundEffectDurationSeconds(segment.text);
  }, 0);
}

export function estimateTaggedDuration(text: string, speed = 1): number {
  if (!text.trim()) return 0;

  const duration = /<speed\s+rate=["']([^"']+)["']>/.test(text)
    ? calculateDurationWithSpeedSegments(text, speed)
    : (() => {
        const effectiveSpeed = /<reread>/.test(text) ? speed * REREAD_SPEED_FACTOR : speed;
        const charsPerSecond = (300 * Math.max(effectiveSpeed, 0.1)) / 60;
        return getTextCharCount(text) / charsPerSecond + getPauseDurationSeconds(text) + getSoundEffectDurationSeconds(text);
      })();

  return Math.round(duration * 0.95 * 10) / 10;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00:00';

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

export function isChineseChar(value: string): boolean {
  return /^[\u4e00-\u9fa5]$/.test(value);
}

export function getPolyphoneOptions(char: string): string[] {
  if (!isChineseChar(char)) return [];

  const result = pinyin(char, {
    pattern: 'pinyin',
    toneType: 'num',
    type: 'array',
    multiple: true,
  });

  if (!Array.isArray(result)) return [];
  return Array.from(new Set(result.filter((item): item is string => Boolean(item))));
}

export function getToneMark(pinyinStr: string): string {
  const tone = pinyinStr.match(/\d$/);
  if (!tone) return pinyinStr.replace(/v/g, 'ü');

  const toneNum = Number(tone[0]);
  const basePinyin = pinyinStr.replace(/\d$/, '');
  if (toneNum === 5 || toneNum === 0) return basePinyin.replace(/v/g, 'ü');

  let charToChange = '';
  let indexToChange = -1;

  if (basePinyin.includes('a')) {
    charToChange = 'a';
    indexToChange = basePinyin.indexOf('a');
  } else if (basePinyin.includes('o')) {
    charToChange = 'o';
    indexToChange = basePinyin.indexOf('o');
  } else if (basePinyin.includes('e')) {
    charToChange = 'e';
    indexToChange = basePinyin.indexOf('e');
  } else if (basePinyin.includes('iu')) {
    charToChange = 'u';
    indexToChange = basePinyin.indexOf('u');
  } else if (basePinyin.includes('ui')) {
    charToChange = 'i';
    indexToChange = basePinyin.indexOf('i');
  } else {
    for (let i = basePinyin.length - 1; i >= 0; i -= 1) {
      if (['i', 'u', 'v', 'ü'].includes(basePinyin[i])) {
        charToChange = basePinyin[i] === 'ü' ? 'v' : basePinyin[i];
        indexToChange = i;
        break;
      }
    }
  }

  if (indexToChange === -1) return basePinyin.replace(/v/g, 'ü');

  const replacements = TONE_MAP[charToChange];
  if (!replacements) return basePinyin.replace(/v/g, 'ü');

  return `${basePinyin.slice(0, indexToChange)}${replacements[toneNum - 1]}${basePinyin.slice(indexToChange + 1)}`;
}
