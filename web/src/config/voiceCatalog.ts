import type { VoiceInfo } from '../services/webTtsService';
import zhiweiAvatar from '../assets/avatars/zhiwei.png';
import xiaoxiaoAvatar from '../assets/avatars/xiaoxiao.jpg';
import xiaofengAvatar from '../assets/avatars/xiaofeng.png';
import xiaoyiAvatar from '../assets/avatars/xiaoyi.jpg';
import yunjianAvatar from '../assets/avatars/yunjian.png';
import yunxiaAvatar from '../assets/avatars/yunxia.jpg';
import xiaobeiAvatar from '../assets/avatars/xiaobei.jpg';
import xiaoniAvatar from '../assets/avatars/xiaoni.jpg';
import xiaoyuAvatar from '../assets/avatars/xiaoyu.jpg';
import yunlongAvatar from '../assets/avatars/yunlong.jpg';
import xiaojiaAvatar from '../assets/avatars/xiaojia.jpg';
import xiaomanAvatar from '../assets/avatars/xiaoman.jpg';
import yunzeAvatar from '../assets/avatars/yunze.jpg';
import xiaochenAvatar from '../assets/avatars/xiaochen.jpg';

export interface CuratedVoice extends VoiceInfo {
  avatar: string;
}

export const curatedVoices: CuratedVoice[] = [
  {
    id: 'zhiwei',
    name: '云希 (男)',
    gender: 'male',
    language: 'zh-CN',
    description:
      '活泼灵动，阳光、活泼、富有朝气。适合动画旁白、短视频讲解、小说中的少年角色、轻松的数字视频。',
    avatar: zhiweiAvatar,
  },
  {
    id: 'xiaoyu',
    name: '晓晓 (女)',
    gender: 'female',
    language: 'zh-CN',
    description:
      '全能情感，音质温婉、亲切、自然，支持多种情绪。适合有声小说、影视解说、情感电台、客服机器人、长文本阅读。',
    avatar: xiaoxiaoAvatar,
  },
  {
    id: 'xiaofeng',
    name: '云野 (男)',
    gender: 'male',
    language: 'zh-CN',
    description:
      '专业稳重，雄浑、有磁性，接近传统新闻主播风格。适合新闻播报、纪录片旁白、企业宣传片、时政解说。',
    avatar: xiaofengAvatar,
  },
  {
    id: 'xiaomei',
    name: '晓伊 (女)',
    gender: 'female',
    language: 'zh-CN',
    description:
      '温柔甜美，声音清脆、甜美、有礼貌，像专业服务人员或知心大姐姐。适合在线客服、语音助理、儿童故事、商场广播。',
    avatar: xiaoyiAvatar,
  },
  {
    id: 'yunjian',
    name: '云健 (男)',
    gender: 'male',
    language: 'zh-CN',
    description:
      '激情澎湃，语速较快，充满力量感和运动感。适合体育赛事解说、竞技游戏讲解、促销广告、热血旁白。',
    avatar: yunjianAvatar,
  },
  {
    id: 'yunxia',
    name: '云霞 (女/儿童)',
    gender: 'female',
    language: 'zh-CN',
    description:
      '可爱童真，稚嫩、纯真、可爱，典型儿童声线。适合幼儿教育、儿童绘本朗读、动画片低幼角色、萌宠视频配音。',
    avatar: yunxiaAvatar,
  },
  {
    id: 'xiaobei',
    name: '晓北 (女) [东北话]',
    gender: 'female',
    language: 'zh-CN',
    description:
      '豪爽、幽默、接地气，自带东北人特有的感染力。适合搞笑段子、生活类 Vlog、东北背景故事叙述、带货直播。',
    avatar: xiaobeiAvatar,
  },
  {
    id: 'xiaoni',
    name: '晓妮 (女) [陕西话]',
    gender: 'female',
    language: 'zh-CN',
    description:
      '淳朴、敦厚、有韵味，能体现西北地区的人土风情。适合历史文化介绍、地方特色美食推广、乡土题材影视解说。',
    avatar: xiaoniAvatar,
  },
  {
    id: 'wanlong',
    name: '云龙 (男) [香港]',
    gender: 'male',
    language: 'zh-HK',
    description:
      '成熟、稳重、商务感，语调带有典型的港式精英气质，发音标准且专业。适合金融资讯播报、企业宣传片、港式商战剧解说。',
    avatar: yunlongAvatar,
  },
  {
    id: 'hiugaai',
    name: '晓佳 (女) [香港粤语]',
    gender: 'female',
    language: 'zh-HK',
    description:
      '柔和、知性、地道，是标准粤语发音，语感自然。适合粤语地区新闻、电台主持、生活百科。',
    avatar: xiaojiaAvatar,
  },
  {
    id: 'hiumaan',
    name: '晓曼 (女) [香港]',
    gender: 'female',
    language: 'zh-HK',
    description:
      '优雅、从容、有书卷气。适合有声书朗读、纪录片旁白、高端品牌广告。',
    avatar: xiaomanAvatar,
  },
  {
    id: 'yunjhe',
    name: '云哲 (男) [台湾]',
    gender: 'male',
    language: 'zh-TW',
    description:
      '温柔、儒雅、语调平缓。适合治愈系短视频、青春偶像剧解说、情感电台、生活提醒。',
    avatar: yunzeAvatar,
  },
  {
    id: 'hsiaochen',
    name: '晓辰 (女) [台湾]',
    gender: 'female',
    language: 'zh-TW',
    description:
      '甜美、阳光、富有活力。适合娱乐资讯、综艺旁白、年轻化 Vlog、闹钟提示。',
    avatar: xiaochenAvatar,
  },
  {
    id: 'hsiaoyu',
    name: '晓语 (女) [台湾]',
    gender: 'female',
    language: 'zh-TW',
    description:
      '专业、清晰、知性，典型台湾国语主播风格。适合教育视频、在线课程、语音助理、正式语音引导。',
    avatar: xiaoyuAvatar,
  },
];

export function getCuratedVoiceById(id: string) {
  return curatedVoices.find((voice) => voice.id === id) ?? curatedVoices[0];
}
