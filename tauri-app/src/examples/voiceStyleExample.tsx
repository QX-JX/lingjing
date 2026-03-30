/**
 * 音色风格检索使用示例
 * 
 * 这个文件展示了如何在组件中使用音色风格检索工具
 */

import { useAppStore } from '../store/useAppStore';
import { retrieveVoiceStyle, searchVoices, formatVoiceStyleInfo } from '../utils/voiceStyleHelper';
import { useEffect } from 'react';

/**
 * 示例1: 在组件中检索当前音色的风格
 */
export function CurrentVoiceStyleExample() {
  const { currentVoice } = useAppStore();
  
  useEffect(() => {
    // 检索当前音色的风格
    const result = retrieveVoiceStyle(currentVoice.id);
    
    if (result.found && result.voice) {
      console.log('当前音色风格信息:');
      console.log(formatVoiceStyleInfo(result.voice));
      
      // 也可以直接访问属性
      console.log('风格:', result.voice.style);
      console.log('适用场景:', result.voice.suitableFor);
      console.log('音色特点:', result.voice.characteristics);
    } else {
      console.warn(result.message);
    }
  }, [currentVoice.id]);

  return null;
}

/**
 * 示例2: 根据关键词搜索音色
 */
export function SearchVoicesExample() {
  useEffect(() => {
    // 搜索包含"专业"的音色
    const results = searchVoices('专业');
    console.log(`找到 ${results.count} 个匹配的音色:`);
    results.results.forEach(voice => {
      console.log(`- ${voice.name}: ${voice.style}`);
    });

    // 搜索包含"甜美"的音色
    const sweetResults = searchVoices('甜美');
    console.log(`找到 ${sweetResults.count} 个甜美的音色`);
  }, []);

  return null;
}

/**
 * 示例3: 在UI中显示音色风格信息
 */
export function VoiceStyleDisplay() {
  const { currentVoice } = useAppStore();
  const styleInfo = retrieveVoiceStyle(currentVoice.id);

  if (!styleInfo.found || !styleInfo.voice) {
    return <div>未找到音色风格信息</div>;
  }

  const { voice } = styleInfo;

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{voice.name}</h3>
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium text-gray-700">风格: </span>
          <span className="text-sm text-gray-600">{voice.style}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">适用场景: </span>
          <span className="text-sm text-gray-600">{voice.suitableFor.join('、')}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">音色特点: </span>
          <span className="text-sm text-gray-600">{voice.characteristics.join('、')}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 示例4: 根据内容类型推荐音色
 */
export function RecommendVoiceByContent(contentType: string) {
  // 内容类型到音色的映射
  const contentTypeMapping: Record<string, string[]> = {
    '新闻': ['zhiwei', 'yunfeng'],
    '教育': ['zhiwei', 'xiaomei'],
    '儿童': ['xiaofeng', 'xiaomeng'],
    '商务': ['xiaomei', 'yunxia'],
    '情感': ['xiaoyu', 'xiaoxuan'],
    '体育': ['yunjian'],
    '故事': ['xiaoyu', 'xiaoxuan'],
  };

  const recommendedVoiceIds = contentTypeMapping[contentType] || [];
  
  return recommendedVoiceIds.map(voiceId => {
    const result = retrieveVoiceStyle(voiceId);
    return result.found ? result.voice : null;
  }).filter(Boolean);
}
