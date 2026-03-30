import { useEffect, useRef } from 'react';
import { useAppStore, HistoryBackupRecord } from '../store/useAppStore';

/**
 * 自动保存 Hook
 * 当文本内容变化时，延迟保存到历史记录
 * 
 * @param delay - 延迟时间（毫秒），默认 5000ms (5秒)
 */
export const useAutoSave = (delay: number = 5000) => {
  const {
    text,
    currentVoice,
    audioConfig,
    bgmConfig,
    addHistoryRecord,
  } = useAppStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTextRef = useRef<string>('');
  const lastSaveTimeRef = useRef<number>(0);

  useEffect(() => {
    // 如果文本为空或与上次保存的文本相同，不保存
    if (!text || text.trim() === '' || text === lastSavedTextRef.current) {
      return;
    }

    // 清除之前的定时器
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 设置新的定时器
    timerRef.current = setTimeout(async () => {
      try {
        // 检查距离上次保存是否超过最小间隔（避免频繁保存）
        const now = Date.now();
        const minInterval = 3000; // 最小间隔 3 秒
        if (now - lastSaveTimeRef.current < minInterval) {
          console.log('[AutoSave] 保存间隔过短，跳过');
          return;
        }

        // 生成标题（取前 20 个字符）
        const title = generateTitle(text);

        // 保存到后端
        const record = await window.electronAPI.saveHistoryRecord({
          text,
          title,
          voiceConfig: currentVoice,
          audioConfig,
          bgmConfig,
        });

        // 添加到前端状态（确保所有必需字段存在）
        const backupRecord: HistoryBackupRecord = {
          ...record,
          title: record.title || '未命名记录',
          voiceConfig: record.voiceConfig || null,
          audioConfig: record.audioConfig || null,
          bgmConfig: record.bgmConfig || null,
        };
        addHistoryRecord(backupRecord);

        // 更新最后保存的文本和时间
        lastSavedTextRef.current = text;
        lastSaveTimeRef.current = now;

        console.log('[AutoSave] 自动保存成功:', record.id);
      } catch (error) {
        console.error('[AutoSave] 自动保存失败:', error);
      }
    }, delay);

    // 清理函数
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [text, currentVoice, audioConfig, bgmConfig, delay, addHistoryRecord]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
};

/**
 * 生成记录标题（从文本前 20 个字符）
 */
function generateTitle(text: string): string {
  if (!text || text.trim().length === 0) {
    return '空白文档';
  }
  const cleaned = text.trim().replace(/\n/g, ' ');
  if (cleaned.length <= 20) {
    return cleaned;
  }
  return cleaned.substring(0, 20) + '...';
}
