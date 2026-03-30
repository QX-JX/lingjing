import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { TextEditor } from './components/TextEditor';
import { VoiceCard } from './components/VoiceCard';
import { StatusBar } from './components/StatusBar';
import { HistoryPanel } from './components/HistoryPanel';
import { TextEditorProvider, useTextEditor } from './contexts/TextEditorContext';
import { DialogProvider } from './contexts/DialogContext';
import { ToastProvider } from './contexts/ToastContext';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import { useAutoSave } from './hooks/useAutoSave';
import { Updater } from './components/Updater';
import { t } from './locales';
import { useEffect } from 'react';
import './App.css';

// 在开发环境中加载音色风格检索工具
if (import.meta.env.DEV) {
  import('./scripts/checkVoiceStyle');
}

// 监听主进程日志（仅在 Electron 环境中）
if (typeof window !== 'undefined' && 'electronAPI' in window) {
  window.electronAPI.onMainProcessLog?.((data: { level: string; args: string[] }) => {
    const { level, args } = data;
    const message = args.join(' ');
    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
  });
}

function AppContent() {
  const { textEditorRef } = useTextEditor();
  const { locale } = useLocale();

  // 启用自动保存功能（每 5 秒保存一次）
  useAutoSave(5000);

  return (
    <div className="App min-h-screen bg-[#f6f8fb] text-slate-900" data-locale={locale}>
      <Header />

      <div className="min-h-[calc(100vh-72px)] flex flex-col bg-gradient-to-r from-[#fdf1eb] via-[#fcf7f5] to-[#fff8e8] pt-5">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Toolbar />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <main className="flex-1 min-h-0 px-5 pt-6 pb-4 flex flex-col">
              <div className="relative flex-1 min-w-0 min-h-0 w-full max-w-[1380px] mx-auto px-8 py-6">
                <div className="absolute inset-x-8 inset-y-6 z-0 flex items-center justify-center -translate-x-[72px] max-[1024px]:translate-x-0">
                  <div className="flex-[0_0_920px] max-w-[920px] min-w-0 h-[calc(100%-56px)] min-h-0 max-h-[720px] flex flex-col rounded-[28px] bg-white shadow-[0_18px_42px_rgba(245,158,11,0.07)] border border-orange-100/90 overflow-hidden">
                    <TextEditor
                      ref={textEditorRef}
                      placeholder={t('textEditor.placeholder')}
                    />
                  </div>
                </div>

                <aside className="absolute right-16 top-14 z-20 w-[160px] max-w-[160px] overflow-visible flex-shrink-0 flex flex-col gap-4 max-[1024px]:static max-[1024px]:w-full max-[1024px]:max-w-none max-[1024px]:mt-4">
                  <VoiceCard />
                </aside>
              </div>
            </main>

            <StatusBar />
          </div>
        </div>
      </div>

      <HistoryPanel />
    </div>
  );
}

function App() {
  useEffect(() => {
    document.body.classList.add('page-not-home');
    return () => document.body.classList.remove('page-not-home');
  }, []);

  return (
    <LocaleProvider>
      <ToastProvider>
        <DialogProvider>
          <Updater />
          <TextEditorProvider>
            <AppContent />
          </TextEditorProvider>
        </DialogProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}

export default App;
