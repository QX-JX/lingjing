/**
 * 音色风格检索脚本
 * 用于在开发环境中快速检索音色风格信息
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行
 * 2. 或导入到组件中使用
 */

import { retrieveVoiceStyle, printVoiceStyle, getVoiceStyleReport, searchVoices } from '../utils/voiceStyleHelper';

// 导出供控制台使用
if (typeof window !== 'undefined') {
  (window as any).voiceStyleHelper = {
    /**
     * 检索指定音色的风格
     * @example voiceStyleHelper.get('zhiwei')
     */
    get: (voiceId: string) => {
      const result = retrieveVoiceStyle(voiceId);
      if (result.found && result.voice) {
        console.log('='.repeat(50));
        console.log(`音色: ${result.voice.name}`);
        console.log(`风格: ${result.voice.style}`);
        console.log(`适用场景: ${result.voice.suitableFor.join('、')}`);
        console.log(`音色特点: ${result.voice.characteristics.join('、')}`);
        console.log('='.repeat(50));
        return result.voice;
      } else {
        console.warn(result.message);
        return null;
      }
    },

    /**
     * 搜索包含关键词的音色
     * @example voiceStyleHelper.search('专业')
     */
    search: (keyword: string) => {
      const results = searchVoices(keyword);
      console.log(`找到 ${results.count} 个匹配的音色（关键词: "${keyword}"）:`);
      results.results.forEach(voice => {
        console.log(`  - ${voice.name}: ${voice.style}`);
      });
      return results;
    },

    /**
     * 获取所有音色的完整报告
     * @example voiceStyleHelper.report()
     */
    report: () => {
      console.log(getVoiceStyleReport());
    },

    /**
     * 检索当前应用的音色风格
     * @example voiceStyleHelper.current()
     */
    current: () => {
      // 需要从 store 中获取当前音色
      // 这里提供一个示例，实际使用时需要导入 useAppStore
      console.log('请在组件中使用以下代码：');
      console.log(`
import { useAppStore } from '../store/useAppStore';
import { retrieveVoiceStyle } from '../utils/voiceStyleHelper';

const { currentVoice } = useAppStore();
const result = retrieveVoiceStyle(currentVoice.id);
console.log(result);
      `);
    },
  };

  console.log('✅ 音色风格检索工具已加载！');
  console.log('使用方法：');
  console.log('  voiceStyleHelper.get("zhiwei")     - 检索指定音色');
  console.log('  voiceStyleHelper.search("专业")    - 搜索音色');
  console.log('  voiceStyleHelper.report()          - 查看完整报告');
}

export { retrieveVoiceStyle, printVoiceStyle, getVoiceStyleReport, searchVoices };
