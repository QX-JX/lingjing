import React, { useEffect, useState } from 'react';
import { X, Clock, Search, Trash2, FileText } from 'lucide-react';
import { useAppStore, HistoryBackupRecord } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { renderTextWithMarkers } from '../utils/textRenderer';
import { t } from '../locales';

export const HistoryPanel: React.FC = () => {
  const {
    isHistoryPanelOpen,
    historyRecords,
    setHistoryPanelOpen,
    setHistoryRecords,
    removeHistoryRecord,
    clearHistoryRecords,
    loadHistoryRecord,
    locale,
  } = useAppStore();

  const { showToast } = useToast();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<HistoryBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载历史记录
  useEffect(() => {
    if (isHistoryPanelOpen) {
      loadHistoryRecords();
    }
  }, [isHistoryPanelOpen]);

  // 搜索过滤
  useEffect(() => {
    if (searchKeyword.trim() === '') {
      setFilteredRecords(historyRecords);
    } else {
      const keyword = searchKeyword.toLowerCase();
      const filtered = historyRecords.filter(
        (record) =>
          record.title.toLowerCase().includes(keyword) ||
          record.text.toLowerCase().includes(keyword)
      );
      setFilteredRecords(filtered);
    }
  }, [searchKeyword, historyRecords]);

  const loadHistoryRecords = async () => {
    setIsLoading(true);
    try {
      const records = await window.electronAPI.getAllHistoryRecords();
      // 确保所有必需字段存在，转换为 HistoryBackupRecord 类型
      const backupRecords: HistoryBackupRecord[] = records.map(record => ({
        ...record,
        title: record.title || '未命名记录',
        voiceConfig: record.voiceConfig || null,
        audioConfig: record.audioConfig || null,
        bgmConfig: record.bgmConfig || null,
      }));
      setHistoryRecords(backupRecords);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      showToast(t('history.loadFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发加载记录

    if (!confirm(t('history.confirmDelete'))) {
      return;
    }

    try {
      await window.electronAPI.deleteHistoryRecord(id);
      removeHistoryRecord(id);
      showToast(t('history.deleteSuccess'), 'success');
    } catch (error) {
      console.error('删除历史记录失败:', error);
      showToast(t('history.deleteFailed'), 'error');
    }
  };

  const handleClearAll = async () => {
    if (!confirm(t('history.confirmClearAll'))) {
      return;
    }

    try {
      await window.electronAPI.clearAllHistoryRecords();
      clearHistoryRecords();
      showToast(t('history.clearSuccess'), 'success');
    } catch (error) {
      console.error('清空历史记录失败:', error);
      showToast(t('history.clearFailed'), 'error');
    }
  };

  const handleLoadRecord = (record: HistoryBackupRecord) => {
    loadHistoryRecord(record);
    showToast(t('history.loadSuccess'), 'success');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // 今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 其他日期
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!isHistoryPanelOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">{t('history.title')}</h2>
            <span className="text-sm text-gray-500">
              ({t('history.total', { count: historyRecords.length.toString() })})
            </span>
          </div>
          <button
            onClick={() => setHistoryPanelOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('history.search')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {historyRecords.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('history.clearAll')}
              </button>
            )}
          </div>
        </div>

        {/* 历史记录列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-gray-500">{t('history.loading')}</div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <FileText className="w-12 h-12 mb-2" />
              <p>
                {searchKeyword ? t('history.noMatchRecords') : t('history.noRecords')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  onClick={() => handleLoadRecord(record)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                >
                  {/* 标题和时间 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3
                        className="font-medium text-gray-800 mb-1"
                        dangerouslySetInnerHTML={{ __html: renderTextWithMarkers(record.title, locale) }}
                      />
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(record.timestamp)}
                        </span>
                        <span>{record.characterCount} {t('history.characters')}</span>
                        {record.voiceConfig && (
                          <span className="text-blue-600">
                            {record.voiceConfig.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecord(record.id, e)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                      title={t('soundEffect.delete')}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>

                  {/* 文本预览 */}
                  <div
                    className="text-sm text-gray-600 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: record.text ? renderTextWithMarkers(record.text, locale) : t('history.blank')
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {t('history.clickToRestore')}
          </p>
        </div>
      </div>
    </div>
  );
};
