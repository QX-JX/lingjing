import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { TextEditor } from './components/TextEditor';
import { VoiceCard } from './components/VoiceCard';
import { StatusBar } from './components/StatusBar';
import { TextEditorProvider, useTextEditor } from './contexts/TextEditorContext';
import { DialogProvider } from './contexts/DialogContext';
import './App.css';

function AppContent() {
  const { textEditorRef } = useTextEditor();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50">
      {/* 顶部导航栏 */}
      <Header />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 功能工具栏 */}
        <Toolbar />

        {/* 中央编辑区和右侧卡片 */}
        <div className="flex-1 flex flex-col relative">
          {/* 中央编辑区 */}
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="w-full max-w-4xl relative">
              <TextEditor
                ref={textEditorRef}
                placeholder="非vip会员,每次限100字、可用部分免费主播、每日试听限10次、下载限2次、可用部分功能、可试用vip主播。vip会员享知意配音全部主播及功能。"
              />

              {/* 右侧发音人卡片 */}
              <VoiceCard />
            </div>
          </div>

          {/* 底部状态栏 */}
          <StatusBar />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <DialogProvider>
      <TextEditorProvider>
        <AppContent />
      </TextEditorProvider>
    </DialogProvider>
  );
}

export default App;
