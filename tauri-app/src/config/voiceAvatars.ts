/**
 * 发音人头像配置
 * 支持多种头像风格：真人头像、动漫头像等
 * 支持使用本地自定义头像
 * 
 * 使用 Vite 静态资源导入，确保打包后资源路径正确
 */

// 导入所有头像资源（使用 Vite 静态资源导入）
import zhiweiAvatar from '../assets/avatars/zhiwei.png';
import xiaoxiaoAvatar from '../assets/avatars/xiaoxiao.jpg';
import xiaofengAvatar from '../assets/avatars/xiaofeng.png';
import xiaoyiAvatar from '../assets/avatars/xiaoyi.jpg';
import yunjianAvatar from '../assets/avatars/yunjian.png';
import yunxiaAvatar from '../assets/avatars/yunxia.jpg';
import xiaobeiAvatar from '../assets/avatars/xiaobei.jpg';
import xiaoniAvatar from '../assets/avatars/xiaoni.jpg';
import yunlongAvatar from '../assets/avatars/yunlong.jpg';
import xiaojiaAvatar from '../assets/avatars/xiaojia.jpg';
import xiaomanAvatar from '../assets/avatars/xiaoman.jpg';
import yunzeAvatar from '../assets/avatars/yunze.jpg';
import xiaochenAvatar from '../assets/avatars/xiaochen.jpg';
import xiaoyuAvatar from '../assets/avatars/xiaoyu.jpg';

// 头像风格类型
export type AvatarStyle = 'realistic' | 'anime' | 'avataaars' | 'big-smile' | 'lorelei' | 'adventurer' | 'custom';

// 默认头像风格（可以修改这里来切换整体风格）
// 使用 big-smile 风格，非常可爱！
export const DEFAULT_AVATAR_STYLE: AvatarStyle = 'lorelei';

/**
 * 导入的头像资源映射
 * Vite 会在构建时处理这些资源，生成正确的路径
 */
const importedAvatars: Record<string, string> = {
  // ========== 中国大陆标准发音人（6个） ==========
  'zhiwei': zhiweiAvatar,       // 云希 (男)
  'xiaoyu': xiaoxiaoAvatar,     // 晓晓 (女) - 文件名是xiaoxiao
  'xiaofeng': xiaofengAvatar,   // 云野 (男)
  'xiaomei': xiaoyiAvatar,      // 晓伊 (女) - 文件名是xiaoyi
  'yunjian': yunjianAvatar,     // 云健 (男)
  'yunxia': yunxiaAvatar,       // 云霞 (女/儿童)

  // ========== 中国大陆方言发音人（2个） ==========
  'xiaobei': xiaobeiAvatar,     // 晓北 (女) [东北话]
  'xiaoni': xiaoniAvatar,       // 晓妮 (女) [陕西话]

  // ========== 香港发音人（3个） ==========
  'wanlong': yunlongAvatar,      // 云龙 (男) [香港] - 文件名是yunlong
  'hiugaai': xiaojiaAvatar,     // 晓佳 (女) [香港粤语] - 文件名是xiaojia
  'hiumaan': xiaomanAvatar,     // 晓曼 (女) [香港] - 文件名是xiaoman

  // ========== 台湾发音人（3个） ==========
  'yunjhe': yunzeAvatar,         // 云哲 (男) [台湾] - 文件名是yunze
  'hsiaochen': xiaochenAvatar,   // 晓辰 (女) [台湾] - 文件名是xiaochen
  'hsiaoyu': xiaoyuAvatar,       // 晓语 (女) [台湾] - 文件名是xiaoyu
};

// 在模块加载时打印所有导入的头像路径（用于调试）
if (typeof window !== 'undefined') {
  console.log('[voiceAvatars] 模块加载 - 导入的头像资源:', {
    importedAvatars: Object.entries(importedAvatars).reduce((acc, [key, value]) => {
      acc[key] = {
        path: value,
        type: typeof value,
        isString: typeof value === 'string',
      };
      return acc;
    }, {} as Record<string, any>),
    sampleImports: {
      zhiweiAvatar,
      xiaoxiaoAvatar,
      xiaofengAvatar,
    },
    locationHref: window.location.href,
    isElectron: 'electronAPI' in window,
  });
}

/**
 * 本地自定义头像配置（已废弃，保留用于兼容）
 * 现在使用 importedAvatars，通过 Vite 静态资源导入
 * @deprecated 使用 importedAvatars 代替
 */
export const customVoiceAvatars: Record<string, string> = {
  // 保留原有配置结构，但实际使用 importedAvatars
  'zhiwei': zhiweiAvatar,
  'xiaoyu': xiaoxiaoAvatar,
  'xiaofeng': xiaofengAvatar,
  'xiaomei': xiaoyiAvatar,
  'yunjian': yunjianAvatar,
  'yunxia': yunxiaAvatar,
  'xiaobei': xiaobeiAvatar,
  'xiaoni': xiaoniAvatar,
  'wanlong': yunlongAvatar,
  'hiugaai': xiaojiaAvatar,
  'hiumaan': xiaomanAvatar,
  'yunjhe': yunzeAvatar,
  'hsiaochen': xiaochenAvatar,
  'hsiaoyu': xiaoyuAvatar,
};

// 为每个发音人分配一个唯一的种子值（用于生成稳定的头像）
// 这样可以确保每个发音人总是显示相同的头像
const voiceAvatarSeeds: Record<string, string> = {
  // 男性发音人
  'zhiwei': 'zhiwei-male-1',
  'xiaofeng': 'xiaofeng-male-2',
  'yunjian': 'yunjian-male-3',
  'yunxia': 'yunxia-male-4',

  // 女性发音人
  'xiaoyu': 'xiaoyu-female-1',
  'xiaomei': 'xiaomei-female-2',
};

/**
 * 根据发音人 ID 和性别生成稳定的头像种子
 * @param voiceId 发音人 ID
 * @param gender 性别
 * @returns 头像种子字符串
 */
function getAvatarSeed(voiceId: string, gender: 'male' | 'female'): string {
  // 优先使用配置的种子
  if (voiceAvatarSeeds[voiceId]) {
    return voiceAvatarSeeds[voiceId];
  }

  // 如果没有配置，使用 voiceId + gender 作为种子
  return `${voiceId}-${gender}`;
}

// 注意：使用 Vite 静态资源导入后，不再需要复杂的路径转换逻辑
// Vite 会自动处理开发和生产环境的路径差异

/**
 * 根据发音人 ID 和性别生成稳定的头像 URL
 * @param voiceId 发音人 ID
 * @param gender 性别 ('male' | 'female')
 * @param size 头像尺寸，默认 150
 * @param style 头像风格，默认使用配置的默认风格
 * @returns 头像图片 URL
 */
/**
 * 转换头像 URL 为 Electron 可用的路径
 * 在 Electron 打包后，需要将绝对路径转换为相对路径
 * 资源会被解压到 app.asar.unpacked/dist/assets/，但我们可以使用相对路径访问
 */
function convertAvatarUrlForElectron(url: string): string {
  if (typeof window === 'undefined' || !('electronAPI' in window)) {
    return url; // 非 Electron 环境，直接返回
  }

  // 如果已经是相对路径（以 ./ 开头），直接返回
  if (url.startsWith('./')) {
    return url;
  }

  // 如果是 file:// 协议且包含 app.asar，需要转换为相对路径
  if (url.startsWith('file://')) {
    // 提取相对于 dist 目录的路径
    // 匹配 app.asar/dist/assets/xxx 或 app.asar.unpacked/dist/assets/xxx
    // 需要处理 Windows 路径格式（file:///D:/...）
    let asarMatch = url.match(/app\.asar(?:\.unpacked)?\/dist\/(.+)$/);
    if (asarMatch) {
      // 返回相对路径，相对于 index.html（在 dist 目录下）
      const relativePath = `./${asarMatch[1]}`;
      console.log('[convertAvatarUrlForElectron] 转换绝对路径:', {
        original: url,
        converted: relativePath,
        extracted: asarMatch[1],
      });
      return relativePath;
    }
    
    // 如果无法匹配 app.asar，尝试匹配 dist/ 目录
    const distMatch = url.match(/\/dist\/(.+)$/);
    if (distMatch) {
      const relativePath = `./${distMatch[1]}`;
      console.log('[convertAvatarUrlForElectron] 从 dist 目录提取路径:', {
        original: url,
        converted: relativePath,
        extracted: distMatch[1],
      });
      return relativePath;
    }
    
    // 如果无法匹配，尝试提取文件名（作为后备方案）
    const fileNameMatch = url.match(/([^/]+\.(png|jpg|jpeg|svg|webp|gif))$/i);
    if (fileNameMatch) {
      // 假设资源在 assets 目录下
      const relativePath = `./assets/${fileNameMatch[1]}`;
      console.log('[convertAvatarUrlForElectron] 从文件名提取路径:', {
        original: url,
        converted: relativePath,
        fileName: fileNameMatch[1],
      });
      return relativePath;
    }
  }

  // 如果是绝对路径（以 / 开头），转换为相对路径
  if (url.startsWith('/')) {
    return `.${url}`;
  }

  // 如果看起来像是相对路径（不以 http、file://、/ 开头），直接返回
  if (!url.startsWith('http') && !url.startsWith('file://') && !url.startsWith('/')) {
    return url;
  }

  return url;
}

export function getVoiceAvatarUrl(
  voiceId: string,
  gender: 'male' | 'female' = 'male',
  size: number = 150,
  style: AvatarStyle = DEFAULT_AVATAR_STYLE
): string {
  // 优先检查是否有导入的本地头像（使用 Vite 静态资源导入）
  if (importedAvatars[voiceId]) {
    const avatarUrl = importedAvatars[voiceId];
    const convertedUrl = convertAvatarUrlForElectron(avatarUrl);
    console.log('[getVoiceAvatarUrl] 找到导入的头像:', {
      voiceId,
      originalUrl: avatarUrl,
      convertedUrl,
      urlType: typeof avatarUrl,
      isString: typeof avatarUrl === 'string',
      locationHref: typeof window !== 'undefined' ? window.location.href : 'N/A',
      isElectron: typeof window !== 'undefined' && 'electronAPI' in window,
    });
    return convertedUrl;
  }
  
  console.log('[getVoiceAvatarUrl] 未找到导入的头像，使用在线头像:', {
    voiceId,
    gender,
    style,
    availableIds: Object.keys(importedAvatars),
  });

  // 如果风格是 custom 但没有配置本地头像，回退到默认风格
  if (style === 'custom') {
    style = DEFAULT_AVATAR_STYLE;
  }

  const seed = getAvatarSeed(voiceId, gender);

  switch (style) {
    case 'custom':
      // 自定义头像（应该已经在上面处理了，这里不会执行到）
      return importedAvatars[voiceId] || '';

    case 'big-smile':
      // 使用 big-smile 风格（非常可爱的大笑脸风格！）
      return `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    case 'lorelei':
      // 使用 lorelei 风格（精灵风格，很可爱）
      return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    case 'adventurer':
      // 使用 adventurer 风格（冒险者风格，比较可爱）
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    case 'anime':
      // 使用 DiceBear 的 avataaars 风格（类似动漫风格）
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    case 'avataaars':
      // 使用 avataaars 风格（卡通头像）
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    case 'realistic':
    default:
      // 使用真人头像（pravatar.cc）
      // 将种子转换为数字 ID
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const avatarId = gender === 'male'
        ? (Math.abs(hash) % 35) + 1
        : (Math.abs(hash) % 35) + 36;
      return `https://i.pravatar.cc/${size}?img=${avatarId}`;
  }
}

/**
 * 获取发音人头像（兼容旧接口，返回图片 URL 或后备字符）
 * @param voiceId 发音人 ID
 * @param voiceName 发音人名称（作为后备）
 * @param gender 性别，用于生成头像
 * @param style 头像风格，默认使用配置的默认风格
 * @returns 头像 URL 或字符
 */
export function getVoiceAvatar(
  voiceId: string,
  voiceName?: string,
  gender?: 'male' | 'female',
  style: AvatarStyle = DEFAULT_AVATAR_STYLE
): string {
  // 如果提供了性别，返回头像 URL
  if (gender) {
    return getVoiceAvatarUrl(voiceId, gender, 150, style);
  }

  // 如果没有配置性别，使用名字的第一个字符作为后备
  return voiceName?.charAt(0) || '?';
}
