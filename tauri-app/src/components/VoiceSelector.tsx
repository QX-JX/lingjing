import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getVoiceList, VoiceInfo, generateAudio } from '../services/ttsService';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { t } from '../locales';

/**
 * 将本地文件路径转换为可用的 URL
 * 在 Electron 中使用 media:// 协议绕过安全限制
 */
function convertFileSrc(filePath: string): string {
  // 检查是否在 Electron 环境中
  if (typeof window !== 'undefined' && 'electronAPI' in window) {
    // 在 Electron 中，使用自定义 media:// 协议绕过安全限制
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `media:///${normalizedPath}`;
  }
  // 非 Electron 环境，使用 file:// 协议
  if (filePath.includes(':')) {
    return `file:///${filePath.replace(/\\/g, '/')}`;
  }
  return `file://${filePath}`;
}

interface VoiceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceSelect?: (voice: { id: string; name: string; avatar: string; gender?: string }) => void;
}

const curatedVoices: VoiceInfo[] = [
  {
    id: 'zhiwei',
    name: '云希 (男)',
    gender: 'male',
    language: 'zh-CN',
    description: '活泼灵动，阳光、活泼、富有朝气。适合动画旁白、短视频讲解、小说中的少年角色、轻松的教学视频',
  },
  {
    id: 'xiaoyu',
    name: '晓晓 (女)',
    gender: 'female',
    language: 'zh-CN',
    description: '全能情感，音质温婉、亲切、自然，支持多种情绪。适合有声小说、影视解说、情感类电台、客服机器人、长文本阅读',
  },
  {
    id: 'xiaofeng',
    name: '云野 (男)',
    gender: 'male',
    language: 'zh-CN',
    description: '专业稳重，雄浑、专业、有磁性，接近传统广播电台的新闻主播。适合新闻播报、纪录片旁白、企业宣传片、严肃的学术讲座、时政解说',
  },
  {
    id: 'xiaomei',
    name: '晓伊 (女)',
    gender: 'female',
    language: 'zh-CN',
    description: '温柔甜美，声音清脆、甜美、有礼貌，像专业的服务人员或知心大姐姐。适合在线客服、语音助理、儿童故事、商场广播、生活贴士提醒',
  },
  {
    id: 'yunjian',
    name: '云健 (男)',
    gender: 'male',
    language: 'zh-CN',
    description: '激情澎湃，语速较快，充满力量感和运动感，声音亢奋极具感染力。适合体育赛事解说、竞技类游戏解说、促销广告、短视频中的"咆哮式"旁白',
  },
  {
    id: 'yunxia',
    name: '云霞 (女/儿童)',
    gender: 'female',
    language: 'zh-CN',
    description: '可爱童真，稚嫩、纯真、可爱，典型的儿童声线。适合幼儿教育、儿童绘本朗读、动画片低幼角色、萌宠视频配音',
  },
  {
    id: 'xiaobei',
    name: '晓北 (女) [东北话]',
    gender: 'female',
    language: 'zh-CN-liaoning',
    description: '豪爽、幽默、接地气，自带东北人特有的幽默感和感染力，听起来非常亲切。适合搞笑段子、生活类 Vlog、东北地区背景的故事叙述、极具辨识度的带货直播',
  },
  {
    id: 'xiaoni',
    name: '晓妮 (女) [陕西话]',
    gender: 'female',
    language: 'zh-CN-shaanxi',
    description: '淳朴、敦厚、有韵味，能够体现出西北地区的风土人情，情感饱满且富有力量。适合历史文化介绍（如西安旅游）、地方特色美食推广、反映西北农村生活的影视解说',
  },
  {
    id: 'wanlong',
    name: '云龙 (男) [香港]',
    gender: 'male',
    language: 'zh-HK',
    description: '成熟、稳重、商务感，语调带有典型的港式精英气质，发音标准且专业。适合金融资讯播报、企业宣传片、港式商战剧解说',
  },
  {
    id: 'hiugaai',
    name: '晓佳 (女) [香港粤语]',
    gender: 'female',
    language: 'zh-HK',
    description: '柔和、知性、地道，这是非常标准的粤语发音，语感自然。适合粤语地区新闻、电台主持、生活百科',
  },
  {
    id: 'hiumaan',
    name: '晓曼 (女) [香港]',
    gender: 'female',
    language: 'zh-HK',
    description: '优雅、从容、有书卷气，相比晓佳，她的声音听起来更像是一个博学、沉静的演讲者。适合有声书朗读、纪录片旁白、高端品牌广告',
  },
  {
    id: 'yunjhe',
    name: '云哲 (男) [台湾]',
    gender: 'male',
    language: 'zh-TW',
    description: '温柔、儒雅、"奶系"感，典型的台湾男生发音，语调平缓，没有攻击性。适合治愈系短视频、青春偶像剧解说、情感类电台、生活贴士提醒',
  },
  {
    id: 'hsiaochen',
    name: '晓辰 (女) [台湾]',
    gender: 'female',
    language: 'zh-TW',
    description: '甜美、阳光、富有活力，听起来像是一位充满朝气的邻家女孩，非常讨喜。适合娱乐资讯、综艺旁白、年轻化的 Vlog、早起闹钟',
  },
  {
    id: 'hsiaoyu',
    name: '晓语 (女) [台湾]',
    gender: 'female',
    language: 'zh-TW',
    description: '专业、清晰、知性，这是典型的"台湾国语"主播风格，咬字清晰，非常有亲和力。适合教育类视频、在线课程讲解、智能语音助理、正式场合的语音引导',
  },
];

function mergeWithCuratedVoices(apiVoices: VoiceInfo[]): VoiceInfo[] {
  const apiVoiceMap = new Map(apiVoices.map((voice) => [voice.id, voice]));

  return curatedVoices.map((voice) => {
    const apiVoice = apiVoiceMap.get(voice.id);
    if (!apiVoice) {
      return voice;
    }
    return {
      ...voice,
      ...apiVoice,
      id: voice.id,
    };
  });
}

export function VoiceSelector({ isOpen, onClose, onVoiceSelect }: VoiceSelectorProps) {
  const { currentVoice, setCurrentVoice, audioConfig, setAudioConfig } = useAppStore();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceInfo | null>(null);
  const [previewConfig, setPreviewConfig] = useState({
    speed: audioConfig.speed,
    pitch: audioConfig.pitch,
    volume: audioConfig.volume,
  });

  /** 用户是否在列表中手动点选过发音人（避免异步加载完成后把选择覆盖回全局 currentVoice） */
  const userPickedVoiceRef = useRef(false);

  // 加载发音人列表
  useEffect(() => {
    if (isOpen) {
      userPickedVoiceRef.current = false;
      loadVoices();
      // 同步当前配置到预览配置（只在对话框打开时同步一次）
      setPreviewConfig({
        speed: currentVoice.speed ?? audioConfig.speed,
        pitch: currentVoice.pitch ?? audioConfig.pitch,
        volume: currentVoice.volume ?? audioConfig.volume,
      });
    }
  }, [isOpen]);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadVoices = async () => {
    setLoading(true);
    try {
      const voiceList = mergeWithCuratedVoices(await getVoiceList());
      setVoices(voiceList);
      if (!userPickedVoiceRef.current && voiceList.length > 0) {
        const current = voiceList.find(v => v.id === currentVoice.id) || voiceList[0];
        setSelectedVoice(current);
      }
    } catch (error) {
      console.error('加载发音人列表失败:', error);
      setVoices(curatedVoices);
      if (!userPickedVoiceRef.current && curatedVoices.length > 0) {
        const current = curatedVoices.find(v => v.id === currentVoice.id) || curatedVoices[0];
        setSelectedVoice(current);
      }
    } finally {
      setLoading(false);
    }
  };

  // 预览发音人
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewErrorHandlerRef = useRef<((e: Event) => void) | null>(null);
  const hasPlayedSuccessfullyRef = useRef<boolean>(false);
  const previewRequestIdRef = useRef(0);
  const stopPreviewRequestedRef = useRef(false);

  const stopPreviewSilently = () => {
    stopPreviewRequestedRef.current = true;
    previewRequestIdRef.current += 1;
    if (previewAudio) {
      if (previewErrorHandlerRef.current) {
        previewAudio.removeEventListener('error', previewErrorHandlerRef.current);
        previewErrorHandlerRef.current = null;
      }
      previewAudio.pause();
      previewAudio.currentTime = 0;
      previewAudio.src = '';
      setPreviewAudio(null);
    }
    setIsPreviewing(false);
    hasPlayedSuccessfullyRef.current = false;
  };

  const handlePreview = async () => {
    if (!selectedVoice) return;
    if (isPreviewing) {
      // 如果正在预览，静默停止播放，不弹错误
      stopPreviewSilently();
      return;
    }

    // 使用发音人名字进行预览："你好，我是xxx"
    const previewText = `${t('voice.preview')} ${selectedVoice.name}`;

    try {
      stopPreviewRequestedRef.current = false;
      const requestId = ++previewRequestIdRef.current;
      const previewVoice = selectedVoice;
      setIsPreviewing(true);

      // 生成预览音频
      const audioPath = await generateAudio(previewText, {
        voice_id: previewVoice.id,
        speed: previewConfig.speed,
        pitch: previewConfig.pitch,
        volume: previewConfig.volume,
      });

      // 期间如果用户已停止/切换导致请求过期，则直接丢弃结果
      if (requestId !== previewRequestIdRef.current || stopPreviewRequestedRef.current) {
        setIsPreviewing(false);
        return;
      }

      // 转换为可播放的 URL
      const audioUrl = convertFileSrc(audioPath);
      console.log('[VoiceSelector] 预览音频路径:', {
        audioPath,
        audioUrl,
        voiceId: previewVoice.id,
        voiceName: previewVoice.name,
      });

      // 重置播放成功标记
      hasPlayedSuccessfullyRef.current = false;

      // 创建临时音频元素播放
      const audio = new Audio(audioUrl);
      audio.volume = previewConfig.volume;
      setPreviewAudio(audio);

      // 监听音频加载成功
      audio.onloadeddata = () => {
        console.log('[VoiceSelector] 预览音频加载成功');
      };

      // 监听可以播放
      audio.oncanplay = () => {
        console.log('[VoiceSelector] 预览音频可以播放');
      };

      // 监听开始播放
      audio.onplay = () => {
        console.log('[VoiceSelector] 预览开始播放');
        hasPlayedSuccessfullyRef.current = true;
      };

      // 播放完成后清理
      audio.onended = () => {
        console.log('[VoiceSelector] 预览播放完成');
        setIsPreviewing(false);
        // 移除错误监听器
        if (previewErrorHandlerRef.current) {
          audio.removeEventListener('error', previewErrorHandlerRef.current);
          previewErrorHandlerRef.current = null;
        }
        setPreviewAudio(null);
        hasPlayedSuccessfullyRef.current = false;
      };

      // 错误处理 - 只在真正出错时显示错误
      const errorHandler = (e: Event) => {
        const error = audio.error;
        console.error('[VoiceSelector] 预览播放失败:', {
          error,
          errorCode: error?.code,
          errorMessage: error?.message,
          audioUrl,
          audioPath,
          hasPlayedSuccessfully: hasPlayedSuccessfullyRef.current,
        });
        
        // 只有在真正出错且没有成功播放过时才显示错误提示
        // error.code: 1=MEDIA_ERR_ABORTED, 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
        // 如果已经成功播放过，说明音频是正常的，可能是后续的清理操作触发的错误，不显示错误提示
        if (error && error.code !== 0 && !hasPlayedSuccessfullyRef.current) {
          setIsPreviewing(false);
          setPreviewAudio(null);
          previewErrorHandlerRef.current = null;
          hasPlayedSuccessfullyRef.current = false;
          alert(t('voice.previewFailed', { error: error.message || 'audio file' }));
        }
      };

      // 保存错误处理器引用，以便后续移除
      previewErrorHandlerRef.current = errorHandler;
      audio.addEventListener('error', errorHandler);

      // 开始播放
      try {
        await audio.play();
        console.log('[VoiceSelector] 预览开始播放');
      } catch (playError) {
        // 用户主动停止或请求已过期时，忽略 interrupted 等中断错误
        if (
          stopPreviewRequestedRef.current ||
          requestId !== previewRequestIdRef.current ||
          String(playError).toLowerCase().includes('interrupted')
        ) {
          setIsPreviewing(false);
          setPreviewAudio(null);
          return;
        }
        console.error('[VoiceSelector] 播放调用失败:', playError);
        // 移除错误监听器
        if (previewErrorHandlerRef.current) {
          audio.removeEventListener('error', previewErrorHandlerRef.current);
          previewErrorHandlerRef.current = null;
        }
        setIsPreviewing(false);
        setPreviewAudio(null);
        alert(t('voice.previewFailed', { error: String(playError) }));
      }
    } catch (error) {
      console.error('预览失败:', error);
      setIsPreviewing(false);
      setPreviewAudio(null);
      alert(t('voice.previewFailed', { error: String(error) }));
    }
  };

  // 组件卸载或对话框关闭时清理音频
  useEffect(() => {
    if (!isOpen) {
      // 对话框关闭时停止预览（不触发错误提示）
      stopPreviewSilently();
    }
    return () => {
      // 组件卸载时清理
      stopPreviewSilently();
    };
  }, [isOpen, previewAudio]);

  // 切换发音人时，停止当前预览，避免旧声音继续播放造成“切了没变化”的错觉
  useEffect(() => {
    if (isPreviewing || previewAudio) {
      stopPreviewSilently();
    }
  }, [selectedVoice?.id]);

  // 应用选择
  const handleApply = () => {
    if (!selectedVoice) return;

    const gender = selectedVoice.gender === 'male' || selectedVoice.gender === 'female' 
      ? selectedVoice.gender 
      : 'male';
    const avatar = getVoiceAvatar(selectedVoice.id, selectedVoice.name, gender);

    // 如果有回调，先调用回调
    if (onVoiceSelect) {
      onVoiceSelect({
        id: selectedVoice.id,
        name: selectedVoice.name,
        avatar: avatar,
        gender: gender,
      });
    } else {
      // 否则更新全局状态
      setCurrentVoice({
        id: selectedVoice.id,
        name: selectedVoice.name,
        avatar: avatar,
        gender: gender,
        speed: previewConfig.speed,
        pitch: previewConfig.pitch,
        volume: previewConfig.volume,
      });

      // 更新音频配置
      setAudioConfig(previewConfig);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-orange-200">
          <h2 className="text-xl font-semibold text-gray-800">{t('voice.selectVoice')}</h2>
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
              <div className="text-gray-500">{t('voice.loadingVoices')}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voices.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() => {
                    userPickedVoiceRef.current = true;
                    setSelectedVoice(voice);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedVoice?.id === voice.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${selectedVoice?.id === voice.id
                      ? 'ring-2 ring-orange-500'
                      : ''
                      }`}>
                      {(() => {
                        const avatarUrl = getVoiceAvatar(voice.id, voice.name, voice.gender === 'male' || voice.gender === 'female' ? voice.gender : 'male');
                        // 检查是否是图片 URL（包括相对路径、绝对路径、file:// 协议等）
                        // 注意：相对路径（./assets/xxx.png）也应该被识别为图片 URL
                        const isImageUrl = avatarUrl.startsWith('http://') || 
                                          avatarUrl.startsWith('https://') ||
                                          avatarUrl.startsWith('app://') ||
                                          avatarUrl.startsWith('file://') ||
                                          (avatarUrl.startsWith('/') || avatarUrl.startsWith('./')) && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(avatarUrl) ||
                                          // 如果路径包含图片扩展名，也认为是图片 URL（处理相对路径的情况）
                                          /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(avatarUrl) && avatarUrl.length > 5;
                        
                        console.log('[VoiceSelector] 渲染头像:', {
                          voiceId: voice.id,
                          voiceName: voice.name,
                          avatarUrl,
                          isImageUrl,
                          avatarType: typeof avatarUrl,
                          urlLength: avatarUrl.length,
                        });
                        
                        if (isImageUrl) {
                          return (
                            <img
                              src={avatarUrl}
                              alt={voice.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // 如果图片加载失败，显示后备字符
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = `avatar-fallback w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg ${selectedVoice?.id === voice.id ? 'bg-orange-500' : 'bg-gray-400'}`;
                                  fallback.textContent = voice.name.charAt(0);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          );
                        } else {
                          return (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-lg ${selectedVoice?.id === voice.id ? 'bg-orange-500' : 'bg-gray-400'}`}>
                              {avatarUrl}
                            </div>
                          );
                        }
                      })()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {(() => {
                          const translated = t(`voices.${voice.id}`);
                          return translated === `voices.${voice.id}` ? voice.name : translated;
                        })()}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {(() => {
                          const translatedDesc = t(`voices.description.${voice.id}`);
                          return translatedDesc === `voices.description.${voice.id}` ? voice.description : translatedDesc;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 配置面板 */}
          {selectedVoice && (
            <div className="mt-6 pt-6 border-t border-orange-200">
              <h3 className="font-medium text-gray-800 mb-4">{t('voice.voiceSettings')}</h3>
              <div className="space-y-4">
                {/* 语速 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    {t('voice.speed')}: {previewConfig.speed.toFixed(1)}x
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
                    {t('voice.pitch')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6">{t('voice.low')}</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={Math.round(((previewConfig.pitch - 0.5) / 1.5) * 10)}
                      onChange={(e) => {
                        // 将 0-10 映射到 0.5-2.0
                        const normalizedPitch = 0.5 + (parseInt(e.target.value) / 10) * 1.5;
                        setPreviewConfig({ ...previewConfig, pitch: normalizedPitch });
                      }}
                      className="flex-1 h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <span className="text-xs text-gray-500 w-6">{t('voice.high')}</span>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-sm text-gray-600">
                      {Math.round(((previewConfig.pitch - 0.5) / 1.5) * 10)}
                    </span>
                  </div>
                </div>

                {/* 音量 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    {t('voice.volume')}: {Math.round(previewConfig.volume * 100)}%
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
                disabled={loading}
                className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isPreviewing
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                {isPreviewing ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>{t('voice.stopPreview')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>{t('voice.preview')}</span>
                  </>
                )}
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
            {t('voice.cancel')}
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedVoice}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {t('voice.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
