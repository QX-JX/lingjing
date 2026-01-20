import { Play, FileDown, Pause, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateDuration, formatDuration, getTextCharCount } from '../utils/textProcessor';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { generateAudio, exportAudio, showSaveDialog } from '../services/ttsService';

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
function convertFileSrc(filePath: string): string {
  // 在 Electron 中，直接使用 file:// 协议
  if (isElectronEnvironment()) {
    // Windows 路径需要额外的斜杠
    if (filePath.includes(':')) {
      return `file:///${filePath.replace(/\\/g, '/')}`;
    }
    return `file://${filePath}`;
  }
  return filePath;
}

export function StatusBar() {
  const { text, audioConfig, currentVoice } = useAppStore();
  const audioPlayer = useAudioPlayer();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudioPath, setCurrentAudioPath] = useState<string | null>(null);

  // 计算预计时长
  const duration = calculateDuration(text, audioConfig.speed);
  const formattedDuration = formatDuration(duration);

  // 试听功能
  const handlePreview = async () => {
    if (getTextCharCount(text) === 0) {
      alert('请先输入文本');
      return;
    }

    // 如果正在播放，则暂停
    if (audioPlayer.state.isPlaying) {
      audioPlayer.pause();
      return;
    }

    // 如果已生成音频且路径相同，直接播放
    if (currentAudioPath && audioPlayer.state.isPaused) {
      audioPlayer.resume();
      return;
    }

    try {
      setIsGenerating(true);

      // 生成音频
      const audioPath = await generateAudio(text, {
        voice_id: currentVoice.id,
        speed: audioConfig.speed,
        pitch: audioConfig.pitch,
        volume: audioConfig.volume,
      });

      setCurrentAudioPath(audioPath);

      // 转换为可用的 URL
      const audioUrl = convertFileSrc(audioPath);

      // 播放音频
      await audioPlayer.play(audioUrl);
    } catch (error) {
      console.error('生成或播放音频失败:', error);
      alert(`生成音频失败: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 导出功能
  const handleExport = async () => {
    if (getTextCharCount(text) === 0) {
      alert('请先输入文本');
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
        });
        setCurrentAudioPath(audioPath);
      } catch (error) {
        console.error('生成音频失败:', error);
        alert(`生成音频失败: ${error}`);
        setIsGenerating(false);
        return;
      } finally {
        setIsGenerating(false);
      }
    }

    // 打开保存对话框
    try {
      const result = await showSaveDialog({
        title: '导出音频',
        defaultPath: `audio_${Date.now()}.wav`,
        filters: [
          {
            name: 'Audio',
            extensions: ['wav', 'mp3'],
          },
        ],
      });

      if (!result.canceled && result.filePath) {
        setIsGenerating(true);
        // 根据文件扩展名确定格式
        const format = result.filePath.toLowerCase().endsWith('.mp3') ? 'mp3' : 'wav';
        await exportAudio(audioPath, result.filePath, format);
        alert('导出成功！');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const isPlaying = audioPlayer.state.isPlaying;
  const isLoading = isGenerating || audioPlayer.state.isLoading;

  return (
    <div className="bg-white border-t border-orange-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePreview}
          disabled={isLoading || getTextCharCount(text) === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium shadow-md cursor-pointer transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>生成中...</span>
            </>
          ) : isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span>暂停</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>试听</span>
            </>
          )}
        </button>

        {/* 播放进度显示 */}
        {audioPlayer.state.duration > 0 && (
          <div className="text-xs text-gray-600">
            {formatDuration(audioPlayer.state.currentTime)} / {formatDuration(audioPlayer.state.duration)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-orange-700">
          <span className="font-medium">{getTextCharCount(text)}</span>/5000
        </div>
        <div className="text-sm text-orange-700">
          预计时长: <span className="font-medium">{formattedDuration}</span>
        </div>
        <button
          onClick={handleExport}
          disabled={isGenerating || getTextCharCount(text) === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium shadow-md cursor-pointer transition-all duration-200"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>导出中...</span>
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4" />
              <span>导出文件</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
