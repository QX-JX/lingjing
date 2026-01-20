import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseAudioPlayerReturn {
  state: AudioPlayerState;
  play: (audioUrl: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  togglePlayPause: () => void;
}

/**
 * 音频播放器 Hook
 * 使用 HTML5 Audio API 实现音频播放功能
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    isLoading: false,
    error: null,
  });

  // 初始化音频元素
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // 事件监听
    const handleLoadedMetadata = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    };

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));
    };

    const handleError = () => {
      setState((prev) => ({
        ...prev,
        error: '音频加载失败',
        isLoading: false,
        isPlaying: false,
      }));
    };

    const handleCanPlay = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // 清理函数
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // 播放音频
  const play = useCallback(async (audioUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // 如果正在播放其他音频，先停止
      if (state.isPlaying) {
        audio.pause();
        audio.currentTime = 0;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      audio.src = audioUrl;
      audio.volume = state.volume;
      
      await audio.play();

      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `播放失败: ${error}`,
        isLoading: false,
        isPlaying: false,
      }));
    }
  }, [state.isPlaying, state.volume]);

  // 暂停
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && state.isPlaying) {
      audio.pause();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: true,
      }));
    }
  }, [state.isPlaying]);

  // 恢复播放
  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && state.isPaused) {
      audio.play().then(() => {
        setState((prev) => ({
          ...prev,
          isPlaying: true,
          isPaused: false,
        }));
      }).catch((error) => {
        setState((prev) => ({
          ...prev,
          error: `恢复播放失败: ${error}`,
        }));
      });
    }
  }, [state.isPaused]);

  // 停止
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));
    }
  }, []);

  // 跳转到指定时间
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, state.duration));
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    }
  }, [state.duration]);

  // 设置音量
  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audio) {
      audio.volume = clampedVolume;
      setState((prev) => ({
        ...prev,
        volume: clampedVolume,
      }));
    }
  }, []);

  // 切换播放/暂停
  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.isPaused) {
      resume();
    }
  }, [state.isPlaying, state.isPaused, pause, resume]);

  return {
    state,
    play,
    pause,
    resume,
    stop,
    seek,
    setVolume,
    togglePlayPause,
  };
}
