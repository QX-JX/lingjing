/**
 * 音色风格配置
 * 集中管理所有音色的风格描述和适用场景
 */

export interface VoiceStyle {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string; // 风格描述
  suitableFor: string[]; // 适用场景
  characteristics: string[]; // 音色特点
}

/**
 * 所有音色的风格配置
 */
export const VOICE_STYLES: Record<string, VoiceStyle> = {
  // 男性发音人
  'zhiwei': {
    id: 'zhiwei',
    name: '云希 (男)',
    gender: 'male',
    style: '活泼灵动风格',
    suitableFor: ['动画旁白', '短视频讲解', '小说中的少年角色', '轻松的教学视频', '生活类内容', '游戏类内容'],
    characteristics: ['阳光', '活泼', '富有朝气', '青少年声音', '充满活力'],
  },
  'xiaofeng': {
    id: 'xiaofeng',
    name: '云野 (男)',
    gender: 'male',
    style: '专业稳重风格',
    suitableFor: ['新闻播报', '纪录片旁白', '企业宣传片', '严肃的学术讲座', '时政解说'],
    characteristics: ['雄浑', '专业', '有磁性', '新闻主播风格', '权威感', '信任感'],
  },
  'yunjian': {
    id: 'yunjian',
    name: '云健 (男)',
    gender: 'male',
    style: '激情澎湃风格',
    suitableFor: ['体育赛事解说', '竞技类游戏解说', '促销广告', '短视频中的"咆哮式"旁白'],
    characteristics: ['语速较快', '充满力量感', '运动感', '声音亢奋', '极具感染力'],
  },
  'yunfeng': {
    id: 'yunfeng',
    name: '云枫 (男)',
    gender: 'male',
    style: '新闻播报风格',
    suitableFor: ['严肃场合', '正式场合', '新闻播报'],
    characteristics: ['成熟稳重', '声音专业', '庄重严肃'],
  },
  'yunze': {
    id: 'yunze',
    name: '云泽 (男)',
    gender: 'male',
    style: '沉稳成熟风格',
    suitableFor: ['企业培训', '纪录片', '正式场合'],
    characteristics: ['沉稳成熟', '声音专业', '适合正式内容'],
  },
  'yunxia': {
    id: 'yunxia',
    name: '云霞 (女/儿童)',
    gender: 'female',
    style: '可爱童真风格',
    suitableFor: ['幼儿教育', '儿童绘本朗读', '动画片低幼角色', '萌宠视频配音'],
    characteristics: ['稚嫩', '纯真', '可爱', '儿童声线'],
  },

  // 女性发音人
  'xiaoyu': {
    id: 'xiaoyu',
    name: '晓晓 (女)',
    gender: 'female',
    style: '全能情感风格',
    suitableFor: ['有声小说', '影视解说', '情感类电台', '客服机器人', '长文本阅读'],
    characteristics: ['温婉', '亲切', '自然', '支持多种情绪', '功能强大'],
  },
  'xiaomei': {
    id: 'xiaomei',
    name: '晓伊 (女)',
    gender: 'female',
    style: '温柔甜美风格',
    suitableFor: ['在线客服', '语音助理', '儿童故事', '商场广播', '生活贴士提醒'],
    characteristics: ['清脆', '甜美', '有礼貌', '专业服务人员', '知心大姐姐'],
  },
  'xiaochen': {
    id: 'xiaochen',
    name: '晓辰 (女)',
    gender: 'female',
    style: '温柔亲切风格',
    suitableFor: ['客服', '导购类内容', '服务类内容'],
    characteristics: ['温柔亲切', '声音友好', '适合服务场景'],
  },
  'xiaomeng': {
    id: 'xiaomeng',
    name: '晓梦 (女)',
    gender: 'female',
    style: '儿童音色风格',
    suitableFor: ['儿童故事', '教育内容', '儿童内容'],
    characteristics: ['儿童音色', '声音可爱', '适合儿童内容'],
  },
  'xiaomo': {
    id: 'xiaomo',
    name: '晓墨 (女)',
    gender: 'female',
    style: '知性成熟风格',
    suitableFor: ['知识付费', '有声书', '专业内容'],
    characteristics: ['知性成熟', '声音优雅', '适合知识类内容'],
  },
  'xiaohan': {
    id: 'xiaohan',
    name: '晓涵 (女)',
    gender: 'female',
    style: '活泼青春风格',
    suitableFor: ['青少年内容', '年轻化内容', '娱乐内容'],
    characteristics: ['活泼青春', '声音年轻', '充满活力'],
  },
  'xiaoxuan': {
    id: 'xiaoxuan',
    name: '晓萱 (女)',
    gender: 'female',
    style: '甜美温柔风格',
    suitableFor: ['情感类内容', '温柔内容', '故事类内容'],
    characteristics: ['甜美温柔', '声音柔和', '适合情感表达'],
  },
};

/**
 * 根据音色ID获取风格信息
 * @param voiceId 音色ID
 * @returns 风格信息，如果不存在则返回null
 */
export function getVoiceStyle(voiceId: string): VoiceStyle | null {
  return VOICE_STYLES[voiceId] || null;
}

/**
 * 根据风格关键词搜索音色
 * @param keyword 风格关键词（如：专业、甜美、活泼等）
 * @returns 匹配的音色列表
 */
export function searchVoicesByStyle(keyword: string): VoiceStyle[] {
  const lowerKeyword = keyword.toLowerCase();
  return Object.values(VOICE_STYLES).filter(voice => {
    return (
      voice.style.toLowerCase().includes(lowerKeyword) ||
      voice.characteristics.some(char => char.toLowerCase().includes(lowerKeyword)) ||
      voice.suitableFor.some(scene => scene.toLowerCase().includes(lowerKeyword))
    );
  });
}

/**
 * 根据适用场景搜索音色
 * @param scene 适用场景（如：新闻、儿童、商务等）
 * @returns 匹配的音色列表
 */
export function searchVoicesByScene(scene: string): VoiceStyle[] {
  const lowerScene = scene.toLowerCase();
  return Object.values(VOICE_STYLES).filter(voice => {
    return voice.suitableFor.some(suitable => suitable.toLowerCase().includes(lowerScene));
  });
}

/**
 * 获取所有音色风格列表
 * @returns 所有音色风格列表
 */
export function getAllVoiceStyles(): VoiceStyle[] {
  return Object.values(VOICE_STYLES);
}

/**
 * 按性别筛选音色
 * @param gender 性别
 * @returns 匹配的音色列表
 */
export function getVoicesByGender(gender: 'male' | 'female'): VoiceStyle[] {
  return Object.values(VOICE_STYLES).filter(voice => voice.gender === gender);
}
