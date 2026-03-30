import { Play, FileDown, Pause, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useToastContext } from '../contexts/ToastContext';
import { calculateDurationWithBGM, formatDuration, getTextCharCount } from '../utils/textProcessor';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { generateAudio, exportAudio, showSaveDialog, cancelGenerateAudio } from '../services/ttsService';
import { AuthDialog } from './AuthDialog';
import { authService } from '../services/authService';
import { t } from '../locales';

/**
 * 检查是否在 Electron 环境中运行
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * 将本地文件路径转换为可用的 URL
 * 在 Electron 中使用 file:// 协议
 */
function convertFileSrcForPlayback(filePath: string): string {
  // 在 Electron 中，使用自定义 media:// 协议绕过安全限制
  if (isElectronEnvironment()) {
    // Windows 路径处理：将反斜杠转换为正斜杠
    const normalizedPath = filePath.replace(/\\/g, '/');
    // 使用 media:// 协议，不需要额外的 /，因为 registerFileProtocol 会直接替换 'media://'
    // 例如 path 是 C:/Files/audio.mp3 -> media:///C:/Files/audio.mp3 (三个斜杠，明确 host 为空)
    return `media:///${normalizedPath}`;
  }
  return filePath;
}

export function StatusBar() {
  const { text, audioConfig, currentVoice, bgmConfig } = useAppStore();
  const { showToast } = useToastContext();
  const audioPlayer = useAudioPlayer();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioPath, setCurrentAudioPath] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    segmentText: string;
  } | null>(null);

  // 授权相关状态
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkAuth = async (action: () => void) => {
    // 1. 检查本地缓存，今天是否已验证
    const isVerified = authService.isVerifiedToday();
    console.log('[StatusBar] Auth check - isVerifiedToday:', isVerified);
    
    if (isVerified) {
      console.log('[StatusBar] Auth check - Already verified today, skipping check');
      action();
      return;
    }

    try {
      // 2. 检查是否需要授权码
      console.log('[StatusBar] Auth check - Checking server status...');
      const result = await authService.checkNeedAuth();
      console.log('[StatusBar] Auth check - Server result:', result);

      if (result.is_need_auth_code === 1) {
        // 需要授权，打开弹窗
        console.log('[StatusBar] Auth check - Auth needed, opening dialog');
        setAuthUrl(result.auth_code_url);
        setPendingAction(() => action);
        setIsAuthDialogOpen(true);
      } else {
        // 不需要授权，直接执行
        console.log('[StatusBar] Auth check - Auth NOT needed');
        action();
      }
    } catch (error) {
      console.error('授权检查失败:', error);
      showToast(t('toast.authCheckFailed'), 'error');
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleCancelGeneration = async () => {
    if (!isGenerating) return;
    const canceled = await cancelGenerateAudio();
    setIsGenerating(false);
    setGenerationProgress(null);
    if (canceled) {
      showToast(t('error.cancelSuccess'), 'info');
    }
  };

  // 记录上次生成音频时的配置
  const [lastGeneratedConfig, setLastGeneratedConfig] = useState<any>(null);

  // 计算预计时长（考虑 BGM）
  useEffect(() => {
    let isCancelled = false;

    const updateEstimatedDuration = async () => {
      const currentConfig = {
        text,
        voiceId: currentVoice.id,
        speed: audioConfig.speed,
        pitch: audioConfig.pitch,
        volume: audioConfig.volume,
        bgmPath: bgmConfig?.path || null,
        bgmVolume: bgmConfig?.volume,
      };

      const isConfigChanged = JSON.stringify(currentConfig) !== JSON.stringify(lastGeneratedConfig);

      // 只有当配置未变化时，才使用实际音频时长
      if (!isConfigChanged && audioPlayer.state.duration > 0) {
        if (!isCancelled) {
          setEstimatedDuration(audioPlayer.state.duration);
        }
        return;
      }

      // 否则计算预计时长（考虑 BGM）
      const duration = await calculateDurationWithBGM(
        text,
        audioConfig.speed,
        bgmConfig?.path || null
      );

      if (!isCancelled) {
        setEstimatedDuration(duration);
      }
    };

    updateEstimatedDuration();

    return () => {
      isCancelled = true;
    };
  }, [
    text,
    audioConfig.speed,
    audioConfig.pitch,
    audioConfig.volume,
    bgmConfig?.path,
    bgmConfig?.volume,
    currentVoice.id,
    audioPlayer.state.duration,
    lastGeneratedConfig,
  ]);

  const formattedDuration = formatDuration(estimatedDuration);


  // 试听功能 - 实际执行逻辑
  const performPreview = async () => {
    if (getTextCharCount(text) === 0) {
      showToast(t('toast.noTextInput'), 'warning');
      return;
    }

    // 如果正在播放，则暂停
    if (audioPlayer.state.isPlaying) {
      audioPlayer.pause();
      return;
    }

    // 构建当前配置对象
    const currentConfig = {
      text,
      voiceId: currentVoice.id,
      speed: audioConfig.speed,
      pitch: audioConfig.pitch,
      volume: audioConfig.volume,
      bgmPath: bgmConfig.path,
      bgmVolume: bgmConfig.volume,
    };

    // 检查配置是否发生变化
    const isConfigChanged = JSON.stringify(currentConfig) !== JSON.stringify(lastGeneratedConfig);

    // 如果已生成音频且配置未变化，直接播放（resume）
    if (currentAudioPath && audioPlayer.state.isPaused && !isConfigChanged) {
      audioPlayer.resume();
      return;
    }

    const textLength = getTextCharCount(text);
    try {
      setIsGenerating(true);

      // 如果是长文本，提示用户可能需要等待
      if (textLength > 1000) {
        const estimatedSegments = Math.ceil(textLength / 1000);
        showToast(t('error.longTextDetected', { count: textLength.toString(), segments: estimatedSegments.toString() }), 'info');
      }

      // 重置进度
      setGenerationProgress(null);

      // 生成音频（带进度回调）
      const audioPath = await generateAudio(text, {
        voice_id: currentVoice.id,
        speed: audioConfig.speed,
        pitch: audioConfig.pitch,
        volume: audioConfig.volume,
        bgmPath: bgmConfig.path,
        bgmVolume: bgmConfig.volume,
      }, (current, total, percentage, segmentText) => {
        console.log('[StatusBar] 进度更新:', { current, total, percentage, segmentText });
        setGenerationProgress({
          current,
          total,
          percentage,
          segmentText: segmentText || ''
        });
      });

      setCurrentAudioPath(audioPath);
      setLastGeneratedConfig(currentConfig); // 更新最后一次生成的配置

      // 转换为可用的 URL
      const audioUrl = convertFileSrcForPlayback(audioPath);

      // 播放音频
      await audioPlayer.play(audioUrl);
    } catch (error) {
      console.error('生成或播放音频失败:', error);

      // 提供更友好的错误提示
      if (String(error).includes('GenerationCancelled')) {
        showToast(t('error.cancelSuccess'), 'info');
        return;
      }
      let errorMessage = `生成音频失败: ${error}`;

      if (String(error).includes('NoAudioReceived')) {
        errorMessage = '网络连接失败，无法生成音频。\n\n可能的原因：\n' +
          '• 网络连接不稳定\n' +
          '• 防火墙阻止了连接\n' +
          '• Azure TTS 服务暂时不可用\n\n' +
          '建议：\n' +
          '• 检查网络连接\n' +
          '• 稍后重试';
      } else if (String(error).includes('timeout') || String(error).includes('超时')) {
        if (textLength > 1000) {
          errorMessage = t('error.longTextTimeout', { count: textLength.toString() });
        } else {
          errorMessage = t('error.timeout');
        }
      } else if (String(error).includes('分段处理失败')) {
        errorMessage = t('error.segmentFailed');
      } else {
        errorMessage = `${t('error.exportError', { error: String(error) })}`;
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  // 试听功能 - 入口
  const handlePreview = () => {
    console.log('[StatusBar] handlePreview clicked');
    // 如果正在播放（需要暂停），不需要验证授权，直接执行
    if (audioPlayer.state.isPlaying) {
      audioPlayer.pause();
      return;
    }
    
    // 直接执行试听，不验证授权码
    performPreview();
  };

  // 导出功能 - 实际执行逻辑
  const performExport = async () => {
    if (getTextCharCount(text) === 0) {
      alert(t('toast.noTextInput'));
      return;
    }

    // 如果没有生成音频，先生成
    let audioPath = currentAudioPath;
    if (!audioPath) {
      try {
        setIsGenerating(true);
        audioPath = await generateAudio(text, {
          voice_id: currentVoice.id,
          speed: audioConfig.speed,
          pitch: audioConfig.pitch,
          volume: audioConfig.volume,
          bgmPath: bgmConfig.path,
          bgmVolume: bgmConfig.volume,
        });
        setCurrentAudioPath(audioPath);
      } catch (error) {
        console.error('生成音频失败:', error);

        const textLength = getTextCharCount(text);

        // 提供更友好的错误提示
        let errorMessage = `生成音频失败: ${error}`;

        if (String(error).includes('NoAudioReceived')) {
          errorMessage = '网络连接失败，无法生成音频。请检查网络连接后重试。';
        } else if (String(error).includes('timeout') || String(error).includes('超时')) {
          const isLongText = textLength > 1000;
          if (isLongText) {
            errorMessage = `生成超时（文本长度: ${textLength} 字）。长文本处理需要更长时间，请等待或尝试分段生成。`;
          } else {
            errorMessage = '生成超时，请尝试缩短文本或稍后重试。';
          }
        } else if (String(error).includes('分段处理失败')) {
          errorMessage = '长文本分段处理失败，请检查网络连接或尝试缩短文本。';
        }

        showToast(errorMessage, 'error');
        setIsGenerating(false);
        return;
      } finally {
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    }

    // 打开保存对话框
    try {
      const result = await showSaveDialog({
        title: t('statusBar.export'),
        defaultPath: `audio_${Date.now()}.mp3`,
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav'],
          },
        ],
      });

      if (!result.canceled && result.filePath) {
        setIsGenerating(true);
        // 根据文件扩展名确定格式，默认为 mp3
        const format = result.filePath.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3';
        await exportAudio(audioPath, result.filePath, format);
        showToast(t('statusBar.exportSuccess'), 'info');
      }
    } catch (error) {
      console.error('导出失败:', error);

      // 提供更友好的错误提示
      let errorMessage = `导出失败: ${error}`;

      const textLength = getTextCharCount(text);

      if (String(error).includes('NoAudioReceived')) {
        errorMessage = '网络连接失败，无法生成音频。请检查网络连接后重试。';
      } else if (String(error).includes('timeout') || String(error).includes('超时')) {
        const isLongText = textLength > 1000;
        if (isLongText) {
          errorMessage = `生成超时（文本长度: ${textLength} 字）。长文本处理需要更长时间，请等待或尝试分段生成。`;
        } else {
          errorMessage = '生成超时，请尝试缩短文本或稍后重试。';
        }
      } else if (String(error).includes('分段处理失败')) {
        errorMessage = '长文本分段处理失败，请检查网络连接或尝试缩短文本。';
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出功能 - 入口
  const handleExport = () => {
    console.log('[StatusBar] handleExport clicked');
    checkAuth(() => performExport());
  };

  const isPlaying = audioPlayer.state.isPlaying;
  const isLoading = isGenerating || audioPlayer.state.isLoading;

  /** 与桌面端一致的渐变主按钮（试听 / 导出） */
  const primaryGradientClass =
    'bg-gradient-to-r from-[#ff7e05] to-[#ff3d5f] hover:from-[#ff8f1a] hover:to-[#ff4d6a] disabled:from-neutral-300 disabled:to-neutral-400 disabled:cursor-not-allowed shadow-sm';
  /** 播放中导出按钮：实心橙（与暂停态工具条一致） */
  const exportBtnClass = isPlaying
    ? 'bg-[#FF9500] hover:bg-[#ff8800] disabled:bg-neutral-300 disabled:cursor-not-allowed shadow-sm'
    : primaryGradientClass;

  return (
    <>
    <div className="bg-white border-t border-orange-200/90 border-b border-slate-300/90 px-5 py-2.5 flex items-center justify-between gap-4 min-h-[52px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={handlePreview}
          disabled={isLoading || getTextCharCount(text) === 0}
          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-white font-medium cursor-pointer transition-all duration-200 ${primaryGradientClass}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              <span className="whitespace-nowrap">
                {generationProgress
                  ? t('statusBar.generating', { percent: Math.min(generationProgress.percentage, 99).toString() })
                  : t('statusBar.generating', { percent: '0' })}
              </span>
            </>
          ) : isPlaying ? (
            <>
              <Pause className="w-4 h-4 shrink-0" strokeWidth={2.5} />
              <span>{t('statusBar.pause')}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 shrink-0" fill="currentColor" />
              <span>{t('statusBar.preview')}</span>
            </>
          )}
        </button>

        {isGenerating && (
          <button
            type="button"
            onClick={handleCancelGeneration}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 px-3 py-2 text-sm font-medium transition-all duration-200"
          >
            <X className="w-4 h-4" />
            <span>{t('statusBar.cancel')}</span>
          </button>
        )}

        {/* 播放进度：等宽灰字，与 exe 一致 */}
        {audioPlayer.state.duration > 0 && !generationProgress && (
          <div className="text-sm text-[#888888] font-mono tabular-nums tracking-tight whitespace-nowrap">
            {formatDuration(audioPlayer.state.currentTime)} / {formatDuration(audioPlayer.state.duration)}
          </div>
        )}

        {/* 生成进度显示 */}
        {generationProgress && (
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden min-w-[120px]">
              <div
                className="bg-gradient-to-r from-[#ff7e05] to-[#ff3d5f] h-full transition-all duration-300"
                style={{ width: `${Math.min(generationProgress.percentage, 99)}%` }}
              />
            </div>
            <div className="text-xs text-[#888888] font-mono whitespace-nowrap">
              {Math.min(generationProgress.percentage, 99)}%
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="text-sm text-[#A34D3D] whitespace-nowrap">
          <span className="font-medium tabular-nums">{getTextCharCount(text)}</span>/5000
        </div>
        <div className="text-sm text-[#A34D3D] whitespace-nowrap">
          {t('statusBar.estimatedDuration', { duration: formattedDuration })}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isGenerating || getTextCharCount(text) === 0}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-white font-medium cursor-pointer transition-all duration-200 ${exportBtnClass}`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              <span className="whitespace-nowrap">{t('statusBar.exporting')}</span>
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 shrink-0" strokeWidth={2.25} />
              <span className="whitespace-nowrap">{t('statusBar.export')}</span>
            </>
          )}
        </button>
      </div>
    </div>

    <AuthDialog 
      isOpen={isAuthDialogOpen}
      onClose={() => {
        setIsAuthDialogOpen(false);
        setPendingAction(null);
      }}
      onSuccess={handleAuthSuccess}
      authUrl={authUrl}
    />
    </>
  );
}
