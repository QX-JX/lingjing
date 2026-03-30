import { useState, useEffect, useRef } from 'react';
import { getVoiceList, VoiceInfo } from '../services/ttsService';
import { getVoiceAvatar } from '../config/voiceAvatars';
import { t } from '../locales';

interface VoiceDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onSelect: (voice: VoiceInfo) => void;
}

export function VoiceDropdown({ isOpen, onClose, position, onSelect }: VoiceDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载发音人列表
  useEffect(() => {
    if (isOpen) {
      loadVoices();
    }
  }, [isOpen]);

  // 点击外部关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

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
      const voiceList = await getVoiceList();
      setVoices(voiceList);
    } catch (error) {
      console.error('加载发音人列表失败:', error);
      // 使用模拟数据（包含所有14个免费中文发音人）
      setVoices([
        // 中国大陆标准发音人（6个）
        {
          id: 'zhiwei',
          name: '云希 (男)',
          gender: 'male',
          language: 'zh-CN',
          description: '活泼灵动，阳光、活泼、富有朝气',
        },
        {
          id: 'xiaoyu',
          name: '晓晓 (女)',
          gender: 'female',
          language: 'zh-CN',
          description: '全能情感，音质温婉、亲切、自然',
        },
        {
          id: 'xiaofeng',
          name: '云野 (男)',
          gender: 'male',
          language: 'zh-CN',
          description: '专业稳重，雄浑、专业、有磁性',
        },
        {
          id: 'xiaomei',
          name: '晓伊 (女)',
          gender: 'female',
          language: 'zh-CN',
          description: '温柔甜美，声音清脆、甜美、有礼貌',
        },
        {
          id: 'yunjian',
          name: '云健 (男)',
          gender: 'male',
          language: 'zh-CN',
          description: '激情澎湃，语速较快，充满力量感',
        },
        {
          id: 'yunxia',
          name: '云霞 (女/儿童)',
          gender: 'female',
          language: 'zh-CN',
          description: '可爱童真，稚嫩、纯真、可爱',
        },
        // 中国大陆方言发音人（2个）
        {
          id: 'xiaobei',
          name: '晓北 (女) [东北话]',
          gender: 'female',
          language: 'zh-CN-liaoning',
          description: '豪爽、幽默、接地气，自带东北人特有的幽默感和感染力',
        },
        {
          id: 'xiaoni',
          name: '晓妮 (女) [陕西话]',
          gender: 'female',
          language: 'zh-CN-shaanxi',
          description: '淳朴、敦厚、有韵味，能够体现出西北地区的风土人情',
        },
        // 香港发音人（3个）
        {
          id: 'wanlong',
          name: '云龙 (男) [香港]',
          gender: 'male',
          language: 'zh-HK',
          description: '成熟、稳重、商务感，语调带有典型的港式精英气质',
        },
        {
          id: 'hiugaai',
          name: '晓佳 (女) [香港粤语]',
          gender: 'female',
          language: 'zh-HK',
          description: '柔和、知性、地道，这是非常标准的粤语发音',
        },
        {
          id: 'hiumaan',
          name: '晓曼 (女) [香港]',
          gender: 'female',
          language: 'zh-HK',
          description: '优雅、从容、有书卷气，声音像博学、沉静的演讲者',
        },
        // 台湾发音人（3个）
        {
          id: 'yunjhe',
          name: '云哲 (男) [台湾]',
          gender: 'male',
          language: 'zh-TW',
          description: '温柔、儒雅、"奶系"感，典型的台湾男生发音',
        },
        {
          id: 'hsiaochen',
          name: '晓辰 (女) [台湾]',
          gender: 'female',
          language: 'zh-TW',
          description: '甜美、阳光、富有活力，像充满朝气的邻家女孩',
        },
        {
          id: 'hsiaoyu',
          name: '晓语 (女) [台湾]',
          gender: 'female',
          language: 'zh-TW',
          description: '专业、清晰、知性，典型的"台湾国语"主播风格',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSelect = (voice: VoiceInfo) => {
    onSelect(voice);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 半透明遮罩层 */}
      <div
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
      />
      
      {/* 下拉菜单 */}
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 w-[280px] max-h-[400px] overflow-y-auto animate-in fade-in zoom-in duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translateX(-50%)',
        }}
      >
      {/* 顶部箭头 */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />

      {/* 标题 */}
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-800">{t('voice.selectVoice')}</h3>
      </div>

      {/* 发音人列表 */}
      <div className="p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 text-sm">{t('voice.loadingVoices')}</div>
          </div>
        ) : (
          <div className="space-y-1">
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => handleVoiceSelect(voice)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors text-left group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ring-2 ring-orange-200">
                  {(() => {
                    const avatarUrl = getVoiceAvatar(voice.id, voice.name, voice.gender === 'male' || voice.gender === 'female' ? voice.gender : 'male');
                    // 检查是否是图片 URL（包括相对路径、绝对路径、file:// 协议等）
                    const isImageUrl = avatarUrl.startsWith('http://') || 
                                      avatarUrl.startsWith('https://') ||
                                      avatarUrl.startsWith('file://') ||
                                      avatarUrl.startsWith('app://') ||
                                      ((avatarUrl.startsWith('/') || avatarUrl.startsWith('./')) && /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(avatarUrl)) ||
                                      // 如果路径包含图片扩展名且长度合理，也认为是图片 URL
                                      (/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(avatarUrl) && avatarUrl.length > 5);
                    
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
                              fallback.className = 'avatar-fallback w-12 h-12 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold text-base';
                              fallback.textContent = voice.name.charAt(0);
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      );
                    } else {
                      return (
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-rose-400 rounded-full flex items-center justify-center text-white font-semibold text-base">
                          {avatarUrl}
                        </div>
                      );
                    }
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{voice.name}</div>
                  <div className="text-xs text-gray-500 truncate">{voice.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
