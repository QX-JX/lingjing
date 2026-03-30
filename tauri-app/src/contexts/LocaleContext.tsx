import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import { setLocale as setI18nLocale, availableLocales as localeOptions } from '../locales';

interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: { code: string; name: string }[];
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const storeLocale = useAppStore((state) => state.locale);
  const storeSetLocale = useAppStore((state) => state.setLocale);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    setI18nLocale(storeLocale);
  }, [storeLocale]);

  const handleSetLocale = (locale: string) => {
    setI18nLocale(locale);
    storeSetLocale(locale);
    forceUpdate({});
  };

  return (
    <LocaleContext.Provider
      value={{
        locale: storeLocale,
        setLocale: handleSetLocale,
        availableLocales: localeOptions,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
