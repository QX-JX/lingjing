import { X, LogOut, Loader2, User, XCircle, ShieldCheck, Globe, MessageSquare, RefreshCw, Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, UserInfo } from '../store/useAppStore';
import { authService } from '../services/authService';
import { adService, AdData } from '../services/adService';
import { useLocale } from '../contexts/LocaleContext';
import appIcon from '../assets/app-icon.png';
import packageJson from '../../package.json';
import { t } from '../locales';

const KUNQIONG_ORIGIN = 'https://www.kunqiongai.com';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginAbortController, setLoginAbortController] = useState<AbortController | null>(null);
  const [adData, setAdData] = useState<AdData | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateResult, setUpdateResult] = useState<{ hasUpdate: boolean; version?: string; updateLog?: string; downloadUrl?: string; packageHash?: string } | null>(null);
  const { user, isLoggedIn, login, logout } = useAppStore();
  const { locale, setLocale, availableLocales } = useLocale();

  useEffect(() => {
    const openSettings = () => setShowSettingsDialog(true);
    window.addEventListener('lingjing:open-settings', openSettings);
    return () => window.removeEventListener('lingjing:open-settings', openSettings);
  }, []);

  // 获取广告数据（带重试和延迟重试）
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const fetchAd = async (isRetry: boolean = false) => {
      try {
        const ad = await adService.getAd();
        if (mounted && ad) {
          setAdData(ad);
        } else if (mounted && !isRetry) {
          // 首次失败后，30秒后重试一次
          retryTimeout = setTimeout(() => {
            if (mounted) {
              fetchAd(true);
            }
          }, 30000);
        }
      } catch (error) {
        console.error('获取广告失败:', error);
        if (mounted && !isRetry) {
          // 首次失败后，30秒后重试一次
          retryTimeout = setTimeout(() => {
            if (mounted) {
              fetchAd(true);
            }
          }, 30000);
        }
      }
    };

    fetchAd();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;

    // 创建 AbortController 用于取消登录
    const abortController = new AbortController();
    setLoginAbortController(abortController);

    try {
      setIsLoggingIn(true);

      // 1. 获取网页端登录地址
      const loginUrlBase = await authService.getWebLoginUrl();

      // 检查是否已取消
      if (abortController.signal.aborted) {
        return;
      }

      // 2. 生成带签名的 nonce
      const signedNonce = await authService.generateSignedNonce();
      const encodedNonce = authService.encodeSignedNonce(signedNonce);

      // 3. 拼接最终登录 URL
      // 注意：这里假设 loginUrlBase 已经包含了协议和域名，例如 "http://.../login"
      // 需要拼接 query 参数
      const loginUrl = `${loginUrlBase}?client_type=desktop&client_nonce=${encodedNonce}`;

      // 4. 在系统默认浏览器中打开登录页面
      console.log('[Header] 在系统浏览器中打开登录页面:', loginUrl);
      
      if (window.electronAPI && window.electronAPI.openExternalUrl) {
        try {
          const result = await window.electronAPI.openExternalUrl(loginUrl);
          if (result.success) {
            console.log('[Header] 登录页面已在系统浏览器中打开');
          } else {
            console.error('[Header] 打开登录页面失败:', result.error);
            // 如果 Electron API 失败，提示用户
            alert(`无法打开登录页面: ${result.error || '未知错误'}\n请手动复制以下地址到浏览器:\n${loginUrl}`);
            throw new Error(`打开登录页面失败: ${result.error || '未知错误'}`);
          }
        } catch (apiError) {
          console.error('[Header] Electron API 调用失败:', apiError);
          // 如果 API 调用失败，提示用户手动打开
          alert(`无法自动打开登录页面，请手动复制以下地址到浏览器:\n${loginUrl}`);
          throw new Error(`打开登录页面失败: ${apiError instanceof Error ? apiError.message : '未知错误'}`);
        }
      } else {
        // 如果不在 Electron 环境中，提示用户
        console.warn('[Header] Electron API 不可用，提示用户手动打开');
        alert(`请手动复制以下地址到浏览器打开登录页面:\n${loginUrl}`);
        throw new Error('Electron API 不可用');
      }

      // 检查是否已取消
      if (abortController.signal.aborted) {
        return;
      }

      // 5. 轮询 Token（传入 abort signal）
      const token = await authService.pollToken(encodedNonce, abortController.signal);

      // 检查是否已取消
      if (abortController.signal.aborted) {
        return;
      }

      // 6. 获取用户信息
      const userInfo = await authService.getUserInfo(token);

      // 7. 更新 Store
      login(token, userInfo);

    } catch (error) {
      // 如果是取消操作，不显示错误提示
      if (error instanceof Error && error.message === 'Login cancelled') {
        console.log('Login cancelled by user');
        return;
      }
      console.error('Login failed:', error);
      alert(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
      setLoginAbortController(null);
    }
  };

  const handleCancelLogin = () => {
    if (loginAbortController) {
      loginAbortController.abort();
      setLoginAbortController(null);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    // 关闭对话框
    setShowUserDialog(false);
    // 乐观更新，直接登出
    const token = useAppStore.getState().token;
    if (token) {
      authService.logout(token).catch(console.error);
    } else {
      logout();
    }
  };

  const handleAvatarClick = () => {
    setShowUserDialog(true);
  };

  const handleCloseDialog = () => {
    setShowUserDialog(false);
  };

  const handleCloseSettingsDialog = () => {
    setShowSettingsDialog(false);
  };

  const handleOpenOfficialWebsite = async () => {
    const url = 'https://www.kunqiongai.com/';
    await handleAdClick(url);
    handleCloseSettingsDialog();
  };

  const handleOpenFeedback = async () => {
    const feedbackUrl = 'https://www.kunqiongai.com/feedback';
    await handleAdClick(feedbackUrl);
    handleCloseSettingsDialog();
  };

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    
    try {
      setIsCheckingUpdate(true);
      
      if (!window.electronAPI?.checkForUpdate) {
        alert('当前环境不支持检查更新');
        setIsCheckingUpdate(false);
        handleCloseSettingsDialog();
        return;
      }

      const result = await window.electronAPI.checkForUpdate();
      
      // 显示更新对话框
      setUpdateResult({
        hasUpdate: result.has_update || false,
        version: result.version,
        updateLog: result.update_log,
        downloadUrl: result.download_url,
        packageHash: result.package_hash
      });
      setShowUpdateDialog(true);
      handleCloseSettingsDialog();
    } catch (error) {
      console.error('检查更新失败:', error);
      alert(`检查更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleCloseUpdateDialog = () => {
    setShowUpdateDialog(false);
    setUpdateResult(null);
  };

  const handleStartUpdate = async () => {
    if (!updateResult?.downloadUrl || !updateResult?.packageHash) return;
    
    try {
      await window.electronAPI?.startUpdate({
        download_url: updateResult.downloadUrl,
        package_hash: updateResult.packageHash
      });
    } catch (e: any) {
      alert(`启动更新失败: ${e.message}`);
    }
  };

  const handleAdClick = async (targetUrl: string) => {
    try {
      // 验证 URL
      if (!targetUrl || !targetUrl.trim()) {
        console.warn('广告链接为空，无法打开');
        return;
      }

      // 确保 URL 是完整的（包含协议）
      let url = targetUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      console.log('[Header] 在系统浏览器中打开广告链接:', url);

      // 优先使用 Electron API 在系统默认浏览器中打开
      if (window.electronAPI && window.electronAPI.openExternalUrl) {
        try {
          const result = await window.electronAPI.openExternalUrl(url);
          if (result.success) {
            console.log('[Header] 广告链接已在系统浏览器中打开');
            return;
          } else {
            console.error('[Header] 打开广告链接失败:', result.error);
            // 如果 Electron API 失败，提示用户
            alert(`无法打开链接: ${result.error || '未知错误'}\n链接地址: ${url}`);
          }
        } catch (apiError) {
          console.error('[Header] Electron API 调用失败:', apiError);
          // 如果 API 调用失败，提示用户手动打开
          alert(`无法自动打开链接，请手动复制以下地址到浏览器:\n${url}`);
        }
      } else {
        // 如果不在 Electron 环境中，提示用户
        console.warn('[Header] Electron API 不可用，提示用户手动打开');
        alert(`请手动复制以下地址到浏览器打开:\n${url}`);
      }
    } catch (error) {
      console.error('[Header] 打开广告链接时发生错误:', error);
      alert(`打开链接时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSiteSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    void handleAdClick(`${KUNQIONG_ORIGIN}/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleMobileSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    void handleAdClick(`${KUNQIONG_ORIGIN}/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileSearchOpen(false);
  };

  const navLink = (path: string, label: string) => (
    <a
      key={path}
      href={`${KUNQIONG_ORIGIN}${path}`}
      className="nav-link"
      onClick={(e) => {
        e.preventDefault();
        void handleAdClick(`${KUNQIONG_ORIGIN}${path}`);
      }}
    >
      {label}
    </a>
  );

  return (
    <>
      <header
        className="header header-solid"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="header-container">
          <div className="header-left" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <div className="logo">
              <a
                href={KUNQIONG_ORIGIN}
                onClick={(e) => {
                  e.preventDefault();
                  void handleAdClick(KUNQIONG_ORIGIN);
                }}
              >
                <img src="https://www.kunqiongai.com/logo.png" alt={t('app.name')} className="logo-img" />
              </a>
            </div>
          </div>

          <nav className="nav" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <a
              href={`${KUNQIONG_ORIGIN}/`}
              className="nav-link active"
              onClick={(e) => {
                e.preventDefault();
                void handleAdClick(`${KUNQIONG_ORIGIN}/`);
              }}
            >
              {t('headerNav.home')}
            </a>
            <div className="nav-item-wrapper" data-nav-wrapper="ai">
              {navLink('/category/ai', t('headerNav.aiTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="office">
              {navLink('/category/office', t('headerNav.officeTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="multimedia">
              {navLink('/category/multimedia', t('headerNav.multimedia'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="development">
              {navLink('/category/development', t('headerNav.devTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="text">
              {navLink('/category/text', t('headerNav.textTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="file">
              {navLink('/category/file', t('headerNav.fileTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="system">
              {navLink('/category/system', t('headerNav.systemTools'))}
            </div>
            <div className="nav-item-wrapper" data-nav-wrapper="life">
              {navLink('/category/life', t('headerNav.lifeTools'))}
            </div>
            {navLink('/news', t('headerNav.aiNews'))}
            {navLink('/custom', t('headerNav.customSoftware'))}
            <div className="nav-language-switch" aria-label={t('settings.language')}>
              <Globe className="nav-language-icon" />
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="nav-language-select"
              >
                {availableLocales.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </nav>

          <div className="header-right" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <form className="search-box" onSubmit={handleSiteSearch}>
              <button type="submit" className="search-icon-btn" aria-label={t('headerSearch.search')}>
                <span>🔍</span>
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('headerSearch.placeholder')}
              />
            </form>

            <div className="header-actions">
              <button
                type="button"
                className="header-search-btn"
                aria-label={t('headerSearch.search')}
                onClick={() => setMobileSearchOpen(true)}
              >
                <img src="https://www.kunqiongai.com/sousuo.png" alt="" className="header-search-icon" />
              </button>
              <button type="button" className="mobile-menu-btn" aria-label={t('header.settings')}>
                ☰
              </button>

              {adData && (
                <div
                  onClick={() => handleAdClick(adData.target_url)}
                  className="lj-ad-strip"
                  style={{
                    width: adData.width ? `${Math.min(adData.width, 200)}px` : '200px',
                    maxHeight: '44px',
                    cursor: 'pointer',
                  }}
                  title={t('ad.clickToView')}
                >
                  <img
                    src={adData.adv_url}
                    alt=""
                    style={{ width: '100%', height: '44px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}

              <div className="lj-app-login-slot flex items-center gap-2">
                {isLoggedIn && user ? (
                  <>
                    <div className="user-menu" role="button" tabIndex={0} onClick={handleAvatarClick}>
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="user-avatar" />
                      ) : (
                        <User className="w-5 h-5 text-[#1e88e5]" />
                      )}
                    </div>
                    {showUserDialog && (
                      <UserInfoDialog user={user} onClose={handleCloseDialog} onLogout={handleLogout} />
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="header-login-btn"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? t('header.loggingIn') : t('header.login')}
                  </button>
                )}

                {showSettingsDialog && (
                  <SettingsDialog
                    onClose={handleCloseSettingsDialog}
                    onOpenOfficialWebsite={handleOpenOfficialWebsite}
                    onOpenFeedback={handleOpenFeedback}
                    onCheckUpdate={handleCheckUpdate}
                    isCheckingUpdate={isCheckingUpdate}
                    locale={locale}
                    setLocale={setLocale}
                    availableLocales={availableLocales}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {mobileSearchOpen &&
        createPortal(
          <div className="search-modal-overlay" onClick={() => setMobileSearchOpen(false)}>
            <div className="search-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="search-modal-header">
                <h3>{t('headerSearch.modalTitle')}</h3>
                <button type="button" className="search-modal-close" aria-label={t('header.close')} onClick={() => setMobileSearchOpen(false)}>
                  ×
                </button>
              </div>
              <div className="search-modal-body">
                <input
                  type="text"
                  className="search-modal-input"
                  placeholder={t('headerSearch.modalPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMobileSearchSubmit()}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      <LoginWaitingDialog isOpen={isLoggingIn} onCancel={handleCancelLogin} />

      {showUpdateDialog && updateResult && (
        <UpdateDialog
          hasUpdate={updateResult.hasUpdate}
          newVersion={updateResult.version}
          updateLog={updateResult.updateLog}
          onClose={handleCloseUpdateDialog}
          onUpdate={handleStartUpdate}
        />
      )}
    </>
  );
}

// 登录等待对话框组件（使用 Portal 渲染到 body）
function LoginWaitingDialog({ 
  isOpen, 
  onCancel 
}: { 
  isOpen: boolean; 
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-8 min-w-[360px] max-w-[420px]">
        <div className="flex flex-col items-center gap-6">
          {/* 加载动画 */}
          <div className="relative">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          </div>
          
          {/* 提示文字 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('login.waiting')}</h3>
            <p className="text-sm text-gray-500">
              {t('login.completeInBrowser')}
            </p>
          </div>

          {/* 取消按钮 */}
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            <span>{t('login.cancelLogin')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 用户信息对话框组件（使用 Portal 渲染到 body）
function UserInfoDialog({ 
  user, 
  onClose,
  onLogout
}: { 
  user: UserInfo;
  onClose: () => void;
  onLogout: () => void;
}) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 min-w-[320px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4">
          {/* 用户头像 */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            {/* 验证图标 */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          
          {/* 用户名 */}
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800 mb-1">{user.nickname}</div>
            <div className="text-sm text-gray-500">{t('login.loggedIn')}</div>
          </div>

          {/* 退出登录按钮 */}
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 rounded-md text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('header.logout')}</span>
          </button>

          {/* 关闭窗口链接 */}
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('header.closeWindow')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 设置对话框组件（使用 Portal 渲染到 body）
function SettingsDialog({
  onClose,
  onOpenOfficialWebsite,
  onOpenFeedback,
  onCheckUpdate,
  isCheckingUpdate,
  locale,
  setLocale,
  availableLocales
}: {
  onClose: () => void;
  onOpenOfficialWebsite: () => void;
  onOpenFeedback: () => void;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: { code: string; name: string }[];
}) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-6 min-w-[320px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">{t('settings.title')}</h3>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 官方网站 */}
          <button
            onClick={onOpenOfficialWebsite}
            className="w-full px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
            title={t('settings.officialWebsite')}
          >
            <Globe className="w-4 h-4" />
            <span>{t('settings.officialWebsite')}</span>
          </button>

          {/* 问题反馈 */}
          <button
            onClick={onOpenFeedback}
            className="w-full px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t('settings.feedback')}</span>
          </button>

          {/* 检查更新 */}
          <button
            onClick={onCheckUpdate}
            disabled={isCheckingUpdate}
            className={`w-full px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isCheckingUpdate
                ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-wait'
                : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
            }`}
          >
            {isCheckingUpdate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('settings.checking')}</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>{t('settings.checkUpdate')}</span>
              </>
            )}
          </button>

          {/* 语言切换 */}
          <div className="border-t border-gray-200 pt-3 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{t('settings.language') || 'Language'}</span>
            </div>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
            >
              {availableLocales.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors text-center py-2"
          >
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 更新检查对话框组件（使用 Portal 渲染到 body）
function UpdateDialog({
  hasUpdate,
  newVersion,
  updateLog,
  onClose,
  onUpdate
}: {
  hasUpdate: boolean;
  newVersion?: string;
  updateLog?: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  // 当前版本号（从 package.json 获取）
  const currentVersion = packageJson.version;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-8 min-w-[400px] max-w-[500px] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center">
            <img 
              src={appIcon} 
              alt="灵境配音" 
              className="w-full h-full object-cover"
            />
          </div>

          {hasUpdate ? (
            <>
              {/* 有新版本 */}
              <div className="text-center w-full">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {t('update.foundNew', { version: newVersion || '' })}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {t('update.currentVersion', { version: currentVersion })}
                </p>
                {updateLog && (
                  <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-4 mb-4 text-left max-h-40 overflow-y-auto">
                    <p className="font-medium mb-2">{t('update.updateContent')}</p>
                    <p className="whitespace-pre-line">{updateLog}</p>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {t('update.updateLater')}
                </button>
                <button
                  onClick={onUpdate}
                  className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  {t('update.updateNow')}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 已是最新版本 */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {t('update.alreadyLatest')}
                </h3>
                <p className="text-base text-gray-600">
                  {t('update.currentVersion', { version: currentVersion })}
                </p>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-md text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 transition-colors"
              >
                {t('update.close')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
