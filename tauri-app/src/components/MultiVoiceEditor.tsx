import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Play, Users } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getVoiceList, VoiceInfo, generateAudio } from '../services/ttsService';

/**
 * 将本地文件路径转换为可用的 URL
 */
function convertFileSrc(filePath: string): string {
  // 在 Electron 中，使用 file:// 协议
  if (filePath.includes(':')) {
    return `file:///${filePath.replace(/\\/g, '/')}`;
  }
  return `file://${filePath}`;
}

interface TextSegment {
  id: string;
  text: string;
  voiceId: string;
  voiceName: string;
}

interface MultiVoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (segments: TextSegment[]) => void;
}

export function MultiVoiceEditor({ isOpen, onClose, onApply }: MultiVoiceEditorProps) {
  const { text } = useAppStore();
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化：将文本分割为段落
  useEffect(() => {
    if (isOpen && text) {
      // 按段落分割文本（换行符、句号等）
      const parts = text.split(/([。！？\n])/).filter(p => p.trim().length > 0);
      const initialSegments: TextSegment[] = parts.map((part, index) => ({
        id: `segment-${index}`,
        text: part.trim(),
        voiceId: 'zhiwei',
        voiceName: '解说-知韦(紧凑版)',
      }));
      setSegments(initialSegments);
    }
  }, [isOpen, text]);

  // 加载发音人列表
  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const voiceList = await getVoiceList();
      setVoices(voiceList);
    } catch (error) {
      console.error('加载发音人列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加分段
  const handleAddSegment = () => {
    const newSegment: TextSegment = {
      id: `segment-${Date.now()}`,
      text: '',
      voiceId: 'zhiwei',
      voiceName: '解说-知韦(紧凑版)',
    };
    setSegments([...segments, newSegment]);
  };

  // 删除分段
  const handleDeleteSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  // 更新分段文本
  const handleUpdateSegmentText = (id: string, newText: string) => {
    setSegments(segments.map(s =>
      s.id === id ? { ...s, text: newText } : s
    ));
  };

  // 更新分段发音人
  const handleUpdateSegmentVoice = (id: string, voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      setSegments(segments.map(s =>
        s.id === id ? { ...s, voiceId: voice.id, voiceName: voice.name } : s
      ));
    }
  };

  // 预览分段
  const handlePreviewSegment = async (segment: TextSegment) => {
    if (!segment.text.trim()) {
      alert('请先输入文本');
      return;
    }

    try {
      const audioPath = await generateAudio(segment.text, {
        voice_id: segment.voiceId,
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
      });

      const audioUrl = convertFileSrc(audioPath);

      // 创建临时音频元素播放
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      await audio.play();
    } catch (error) {
      console.error('预览失败:', error);
      alert(`预览失败: ${error}`);
    }
  };

  // 应用分段
  const handleApply = () => {
    // 合并所有分段文本，用标记分隔
    const combinedText = segments
      .map(s => `<voice voice_id="${s.voiceId}">${s.text}</voice>`)
      .join('\n');

    // 更新全局文本
    const { setText } = useAppStore.getState();
    setText(combinedText);

    // 调用回调
    onApply(segments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800">多发音人编辑</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">加载中...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={segment.text}
                        onChange={(e) => handleUpdateSegmentText(segment.id, e.target.value)}
                        placeholder="输入文本内容..."
                        className="w-full min-h-[60px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteSegment(segment.id)}
                      className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除分段"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={segment.voiceId}
                      onChange={(e) => handleUpdateSegmentVoice(segment.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {voices.map(voice => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handlePreviewSegment(segment)}
                      disabled={!segment.text.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>预览</span>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddSegment}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-gray-600 hover:text-orange-600"
              >
                <Plus className="w-5 h-5" />
                <span>添加分段</span>
              </button>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-orange-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            disabled={segments.length === 0 || segments.some(s => !s.text.trim())}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
