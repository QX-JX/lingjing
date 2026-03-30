import zhCN from './zh_CN.json';
import zhTW from './zh_TW.json';
import en from './en.json';
import ja from './ja.json';
import ko from './ko.json';
import es from './es.json';
import fr from './fr.json';
import ru from './ru.json';
import de from './de.json';
import it from './it.json';
import pt from './pt.json';
import ptBR from './pt_BR.json';
import ar from './ar.json';
import bn from './bn.json';
import fa from './fa.json';
import he from './he.json';
import hi from './hi.json';
import id from './id.json';
import ms from './ms.json';
import nl from './nl.json';
import pl from './pl.json';
import sw from './sw.json';
import ta from './ta.json';
import th from './th.json';
import tl from './tl.json';
import tr from './tr.json';
import uk from './uk.json';
import ur from './ur.json';
import vi from './vi.json';

export type LocaleKey = typeof zhCN;

const translations: Record<string, LocaleKey> = {
  'zh_CN': zhCN,
  'zh_TW': zhTW,
  'en': en,
  'ja': ja,
  'ko': ko,
  'es': es,
  'fr': fr,
  'ru': ru,
  'de': de,
  'it': it,
  'pt': pt,
  'pt_BR': ptBR,
  'ar': ar,
  'bn': bn,
  'fa': fa,
  'he': he,
  'hi': hi,
  'id': id,
  'ms': ms,
  'nl': nl,
  'pl': pl,
  'sw': sw,
  'ta': ta,
  'th': th,
  'tl': tl,
  'tr': tr,
  'uk': uk,
  'ur': ur,
  'vi': vi,
};

export const availableLocales = [
  { code: 'zh_CN', name: '简体中文' },
  { code: 'zh_TW', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ru', name: 'Русский' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'pt_BR', name: 'Português (Brasil)' },
  { code: 'ar', name: 'العربية' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'fa', name: 'فارسی' },
  { code: 'he', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'id', name: 'Indonesia' },
  { code: 'ms', name: 'Melayu' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'th', name: 'ไทย' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська' },
  { code: 'ur', name: 'اردو' },
  { code: 'vi', name: 'Tiếng Việt' },
];

const defaultLocale = 'zh_CN';

let currentLocale = defaultLocale;

export function setLocale(locale: string) {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): string {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>, locale?: string): string {
  const targetLocale = locale || currentLocale;
  const keys = key.split('.');
  let value: any = translations[targetLocale] || translations[defaultLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`;
    });
  }

  return value;
}

export default { t, setLocale, getLocale, availableLocales };
