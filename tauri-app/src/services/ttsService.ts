// TTS 配置接口
export interface TtsConfig {
  voice_id: string;
  speed: number;    // 语速 0.5-2.0
  pitch: number;    // 音调 0.5-2.0
  volume: number;   // 音量 0-1
  bgmPath?: string | null;  // 背景音乐路径
  bgmVolume?: number;       // 背景音乐音量 0-1
}

// 发音人信息接口
export interface VoiceInfo {
  id: string;
  name: string;
  gender: string;
  language: string;
  description: string;
}

/**
 * 检查是否在 Electron 环境中运行
 */
function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * 生成音频文件
 * @param text 要转换的文本
 * @param config TTS 配置
 * @param onProgress 进度回调函数 (可选)
 * @returns 音频文件路径
 */
export async function generateAudio(
  text: string,
  config: TtsConfig,
  onProgress?: (current: number, total: number, percentage: number, segmentText: string) => void
): Promise<string> {
  if (!isElectronEnvironment()) {
    throw new Error(
      '此功能需要在 Electron 应用窗口中运行。\n' +
      '请使用 "npm run electron:dev" 启动应用。'
    );
  }

  try {
    // 设置进度监听器（如果提供了回调）
    let progressListener: ((data: any) => void) | null = null;
    if (onProgress && window.electronAPI.onTtsProgress) {
      // preload.cjs 中的回调会接收 (event, data)，但我们只需要 data
      progressListener = (data: any) => {
        console.log('[TTS Service] 收到进度更新:', data);
        if (data && typeof data.current === 'number' && typeof data.total === 'number') {
          onProgress(data.current, data.total, data.percentage || Math.round((data.current / data.total) * 100), data.segmentText || '');
        }
      };
      window.electronAPI.onTtsProgress(progressListener);
      console.log('[TTS Service] 已设置进度监听器');
    } else {
      console.warn('[TTS Service] 无法设置进度监听器:', {
        hasOnProgress: !!onProgress,
        hasOnTtsProgress: !!window.electronAPI.onTtsProgress,
        electronAPI: typeof window.electronAPI
      });
    }

    try {
      const audioPath = await window.electronAPI.generateAudio(text, config);
      // 返回纯文件路径，由调用方（如 StatusBar）决定如何转换为 URL
      return audioPath;
    } finally {
      // 清理进度监听器
      if (progressListener && window.electronAPI.removeTtsProgressListener) {
        window.electronAPI.removeTtsProgressListener();
        console.log('[TTS Service] 已清理进度监听器');
      }
    }
  } catch (error) {
    throw new Error(`生成音频失败: ${error}`);
  }
}

export async function cancelGenerateAudio(): Promise<boolean> {
  if (!isElectronEnvironment()) {
    return false;
  }
  if (!window.electronAPI.cancelGenerateAudio) {
    return false;
  }
  return await window.electronAPI.cancelGenerateAudio();
}

/**
 * 获取可用发音人列表
 * @returns 发音人列表
 */
export async function getVoiceList(): Promise<VoiceInfo[]> {
  if (!isElectronEnvironment()) {
    // 如果不在 Electron 环境中，返回模拟数据（包含所有14个免费中文发音人）
    return [
      // 中国大陆标准发音人（6个）
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
      // 中国大陆方言发音人（2个）
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
      // 香港发音人（3个）
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
      // 台湾发音人（3个）
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
  }

  try {
    const voices = await window.electronAPI.getVoiceList();
    return voices;
  } catch (error) {
    throw new Error(`获取发音人列表失败: ${error}`);
  }
}

/**
 * 计算预计时长（秒）
 * @param text 文本内容
 * @param speed 语速
 * @returns 预计时长（秒）
 */
export async function calculateDuration(
  text: string,
  speed: number
): Promise<number> {
  if (!isElectronEnvironment()) {
    // 如果不在 Electron 环境中，使用前端计算
    const { calculateDuration: frontendCalculateDuration } = await import('../utils/textProcessor');
    return frontendCalculateDuration(text, speed);
  }

  try {
    const duration = await window.electronAPI.calculateDuration(text, speed);
    return duration;
  } catch (error) {
    throw new Error(`计算时长失败: ${error}`);
  }
}

/**
 * 导出音频文件
 * @param sourcePath 源文件路径
 * @param targetPath 目标文件路径
 * @param format 导出格式 ("mp3" | "wav")
 * @returns 导出文件路径
 */
export async function exportAudio(
  sourcePath: string,
  targetPath: string,
  format: string = 'mp3'
): Promise<string> {
  if (!isElectronEnvironment()) {
    throw new Error(
      '导出功能需要在 Electron 应用窗口中运行。\n' +
      '请使用 "npm run electron:dev" 启动应用。'
    );
  }

  try {
    const exportedPath = await window.electronAPI.exportAudio(
      sourcePath,
      targetPath,
      format
    );
    return exportedPath;
  } catch (error) {
    throw new Error(`导出音频失败: ${error}`);
  }
}

/**
 * 混合背景音乐
 * @param voicePath 语音文件路径
 * @param bgmPath BGM 文件路径
 * @param options 混合选项
 * @returns 混合后的文件路径
 */
export async function mixBackgroundMusic(
  voicePath: string,
  bgmPath: string,
  options: { bgmVolume?: number; voiceVolume?: number } = {}
): Promise<string> {
  if (!isElectronEnvironment()) return voicePath;

  try {
    return await window.electronAPI.mixBackgroundMusic(voicePath, bgmPath, options);
  } catch (error) {
    throw new Error(`混合背景音乐失败: ${error}`);
  }
}

/**
 * 获取预设背景音乐列表
 */
export async function getPresetBgmList(): Promise<{ id: string; name: string; path: string | null }[]> {
  if (!isElectronEnvironment()) return [];

  try {
    return await window.electronAPI.getPresetBgmList();
  } catch (error) {
    throw new Error(`获取背景音乐列表失败: ${error}`);
  }
}

/**
 * 导入文本文件
 * @param filePath 文件路径
 * @returns 文件内容
 */
export async function importTextFile(filePath: string): Promise<string> {
  if (!isElectronEnvironment()) return '';

  try {
    return await window.electronAPI.importTextFile(filePath);
  } catch (error) {
    throw new Error(`导入文本失败: ${error}`);
  }
}

/**
 * 导出项目
 */
export async function exportProject(projectData: any, targetPath: string): Promise<string> {
  if (!isElectronEnvironment()) throw new Error('Not in Electron');
  return await window.electronAPI.exportProject(projectData, targetPath);
}

/**
 * 导入项目
 */
export async function importProject(filePath: string): Promise<any> {
  if (!isElectronEnvironment()) throw new Error('Not in Electron');
  return await window.electronAPI.importProject(filePath);
}

/**
 * 显示保存对话框
 */
export async function showSaveDialog(options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<{ canceled: boolean; filePath?: string }> {
  if (!isElectronEnvironment()) {
    throw new Error('保存对话框需要在 Electron 应用中运行。');
  }

  return window.electronAPI.showSaveDialog(options);
}

/**
 * 显示打开对话框
 */
export async function showOpenDialog(options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}): Promise<{ canceled: boolean; filePaths: string[] }> {
  if (!isElectronEnvironment()) {
    throw new Error('打开对话框需要在 Electron 应用中运行。');
  }

  const result = await window.electronAPI.showOpenDialog(options);
  return {
    canceled: result.canceled,
    filePaths: result.filePaths
  };
}

/**
 * 上传自定义音效
 * @param file 音频文件
 * @returns 上传结果
 */
export async function uploadCustomSound(file: File): Promise<{
  fileName: string;
  originalName: string;
  filePath: string;
}> {
  if (!isElectronEnvironment()) {
    throw new Error('上传功能需要在 Electron 应用中运行。');
  }

  try {
    // 将 File 对象转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Array.from(new Uint8Array(arrayBuffer));

    const result = await window.electronAPI.uploadCustomSound({
      buffer,
      originalName: file.name,
      size: file.size
    });

    return result;
  } catch (error) {
    throw new Error(`上传音效失败: ${error}`);
  }
}

/**
 * 删除自定义音效
 * @param fileName 文件名
 */
export async function deleteCustomSound(fileName: string): Promise<void> {
  if (!isElectronEnvironment()) {
    throw new Error('删除功能需要在 Electron 应用中运行。');
  }

  try {
    await window.electronAPI.deleteCustomSound(fileName);
  } catch (error) {
    throw new Error(`删除音效失败: ${error}`);
  }
}

/**
 * 上传背景音乐
 * @param file 音频文件
 * @returns 上传结果
 */
export async function uploadBackgroundMusic(file: File): Promise<{
  fileName: string;
  originalName: string;
  filePath: string;
}> {
  if (!isElectronEnvironment()) {
    throw new Error('上传功能需要在 Electron 应用中运行。');
  }

  try {
    // 将 File 对象转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Array.from(new Uint8Array(arrayBuffer));

    const result = await window.electronAPI.uploadBackgroundMusic({
      buffer,
      originalName: file.name,
      size: file.size
    });

    return result;
  } catch (error) {
    throw new Error(`上传背景音乐失败: ${error}`);
  }
}
