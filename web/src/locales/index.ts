import { createI18n } from 'vue-i18n';
import { applyDomSeo, syncUrlLangParam } from '../config/localeSeo';

type LocaleMessage = Record<string, any>;
const BASE_LOCALE = 'en';

const localeNameMap: Record<string, string> = {
  zh_CN: '\u7b80\u4f53\u4e2d\u6587',
  zh_TW: '\u7e41\u9ad4\u4e2d\u6587',
  en: 'English',
  ja: '\u65e5\u672c\u8a9e',
  ko: '\ud55c\uad6d\uc5b4',
  es: 'Espa\u00f1ol',
  fr: 'Fran\u00e7ais',
  ru: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Portugu\u00eas',
  pt_BR: 'Portugu\u00eas (Brasil)',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  bn: '\u09ac\u09be\u0982\u09b2\u09be',
  fa: '\u0641\u0627\u0631\u0633\u06cc',
  he: '\u05e2\u05d1\u05e8\u05d9\u05ea',
  hi: '\u0939\u093f\u0928\u094d\u0926\u0940',
  id: 'Indonesia',
  ms: 'Melayu',
  nl: 'Nederlands',
  pl: 'Polski',
  sw: 'Kiswahili',
  ta: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd',
  th: '\u0e44\u0e17\u0e22',
  tl: 'Tagalog',
  tr: 'T\u00fcrk\u00e7e',
  uk: '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430',
  ur: '\u0627\u0631\u062f\u0648',
  vi: 'Ti\u1ebfng Vi\u1ec7t',
};

const localeModules = import.meta.glob('./*.json', { eager: true }) as Record<string, { default: LocaleMessage }>;

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeWithBase(base: LocaleMessage, target: LocaleMessage): LocaleMessage {
  const result: LocaleMessage = { ...base };

  for (const key of Object.keys(target)) {
    const baseValue = base[key];
    const targetValue = target[key];

    if (isPlainObject(baseValue) && isPlainObject(targetValue)) {
      result[key] = mergeWithBase(baseValue, targetValue);
    } else {
      result[key] = targetValue;
    }
  }

  return result;
}

const translations = Object.entries(localeModules).reduce<Record<string, LocaleMessage>>((acc, [filePath, module]) => {
  const matched = filePath.match(/\.\/(.+)\.json$/);
  if (!matched) {
    return acc;
  }

  const code = matched[1];

  // 忽略备份副本文件，例如 "en copy.json"
  if (code.includes('copy')) {
    return acc;
  }

  acc[code] = module.default;
  return acc;
}, {});

const baseMessages = translations[BASE_LOCALE] || {};
const mergedTranslations = Object.keys(translations).reduce<Record<string, LocaleMessage>>((acc, code) => {
  acc[code] = code === BASE_LOCALE ? translations[code] : mergeWithBase(baseMessages, translations[code]);
  return acc;
}, {});

export const availableLocales = Object.keys(mergedTranslations).map((code) => ({
  code,
  name: localeNameMap[code] || code,
}));

const defaultLocale = 'zh_CN';

function resolveInitialLocale(): string {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && mergedTranslations[q]) return q;
  } catch {
    /* ignore */
  }
  const pl = typeof window !== 'undefined' ? window.PAGE_LOCALE : undefined;
  if (pl && mergedTranslations[pl]) return pl;
  return defaultLocale;
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: defaultLocale,
  messages: mergedTranslations,
});

export function setLocale(locale: string) {
  if (mergedTranslations[locale]) {
    i18n.global.locale.value = locale;
    applyDomSeo(locale);
    syncUrlLangParam(locale);
  }
}

export function getLocale(): string {
  return i18n.global.locale.value;
}

export function t(key: string, params?: Record<string, string | number>): string {
  return key;
}

export default { i18n, setLocale, getLocale, availableLocales };
