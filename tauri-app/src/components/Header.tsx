import { Mic, LogIn } from 'lucide-react';

export function Header() {
  const handleLogin = () => {
    // TODO: 后续实现登录功能
    alert('登录功能将在后续版本实现');
  };

  return (
    <header className="bg-white border-b border-orange-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center shadow-md">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
          智绘配音
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-md cursor-pointer transition-all duration-200"
        >
          <LogIn className="w-4 h-4" />
          <span>注册登录</span>
        </button>
      </div>
    </header>
  );
}
