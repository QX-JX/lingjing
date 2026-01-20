import { useState, useEffect } from 'react';
import { X, Play, Volume2 } from 'lucide-react';
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

interface VoiceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceSelector({ isOpen, onClose }: VoiceSelectorProps) {
  const { currentVoice, setCurrentVoice, audioConfig, setAudioConfig } = useAppStore();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceInfo | null>(null);
  const [previewConfig, setPreviewConfig] = useState({
    speed: audioConfig.speed,
    pitch: audioConfig.pitch,
    volume: audioConfig.volume,
  });

  // 加载发音人列表
  useEffect(() => {
    if (isOpen) {
      loadVoices();
      // 查找当前选中的发音人
      const current = voices.find(v => v.id === currentVoice.id);
      if (current) {
        setSelectedVoice(current);
      }
    }
  }, [isOpen]);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const voiceList = await getVoiceList();
      setVoices(voiceList);
      // 设置默认选中
      if (voiceList.length > 0 && !selectedVoice) {
        const current = voiceList.find(v => v.id === currentVoice.id) || voiceList[0];
        setSelectedVoice(current);
      }
    } catch (error) {
      console.error('加载发音人列表失败:', error);
      // 如果加载失败，使用模拟数据
      setVoices([
        {
          id: 'zhiwei',
          name: '解说-知韦(紧凑版)',
          gender: 'male',
          language: 'zh-CN',
          description: '专业解说风格，适合新闻、教育类内容',
        },
        {
          id: 'xiaoyu',
          name: '温柔-小语(女)',
          gender: 'female',
          language: 'zh-CN',
          description: '温柔甜美，适合情感类、故事类内容',
        },
        {
          id: 'xiaofeng',
          name: '活泼-小风(男)',
          gender: 'male',
          language: 'zh-CN',
          description: '活泼开朗，适合儿童、娱乐类内容',
        },
        {
          id: 'xiaomei',
          name: '知性-小美(女)',
          gender: 'female',
          language: 'zh-CN',
          description: '知性优雅，适合商务、知识类内容',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 预览发音人
  const handlePreview = async () => {
    if (!selectedVoice) return;

    // 使用示例文本进行预览
    const previewText = '这是一段预览文本，用于测试发音人的效果。';

    try {
      // 生成预览音频
      const audioPath = await generateAudio(previewText, {
        voice_id: selectedVoice.id,
        speed: previewConfig.speed,
        pitch: previewConfig.pitch,
        volume: previewConfig.volume,
      });

      // 转换为可播放的 URL
      const audioUrl = convertFileSrc(audioPath);

      // 创建临时音频元素播放
      const audio = new Audio(audioUrl);
      audio.volume = previewConfig.volume;
      await audio.play();

      // 播放完成后清理
      audio.onended = () => {
        // 清理资源
      };
    } catch (error) {
      console.error('预览失败:', error);
      alert(`预览失败: ${error}`);
    }
  };

  // 应用选择
  const handleApply = () => {
    if (!selectedVoice) return;

    // 更新当前发音人
    setCurrentVoice({
      id: selectedVoice.id,
      name: selectedVoice.name,
      avatar: selectedVoice.name.charAt(0),
      speed: previewConfig.speed,
      pitch: previewConfig.pitch,
      volume: previewConfig.volume,
    });

    // 更新音频配置
    setAudioConfig(previewConfig);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200">
          <h2 className="text-xl font-semibold text-gray-800">选择发音人</h2>
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
              <div className="text-gray-500">加载发音人列表...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedVoice?.id === voice.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${selectedVoice?.id === voice.id
                        ? 'bg-orange-500'
                        : 'bg-gray-400'
                      }`}>
                      {voice.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{voice.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {voice.gender === 'male' ? '👨' : '👩'} {voice.language}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">{voice.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 配置面板 */}
          {selectedVoice && (
            <div className="mt-6 pt-6 border-t border-orange-200">
              <h3 className="font-medium text-gray-800 mb-4">发音人配置</h3>
              <div className="space-y-4">
                {/* 语速 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    语速: {previewConfig.speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={previewConfig.speed}
                    onChange={(e) =>
                      setPreviewConfig({ ...previewConfig, speed: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                {/* 音调 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    音调: {previewConfig.pitch.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={previewConfig.pitch}
                    onChange={(e) =>
                      setPreviewConfig({ ...previewConfig, pitch: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                {/* 音量 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    音量: {Math.round(previewConfig.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={previewConfig.volume}
                    onChange={(e) =>
                      setPreviewConfig({ ...previewConfig, volume: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              </div>

              {/* 预览按钮 */}
              <button
                onClick={handlePreview}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>预览</span>
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
            disabled={!selectedVoice}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
