// TTS 配置接口
export interface TtsConfig {
  voice_id: string;
  speed: number;    // 语速 0.5-2.0
  pitch: number;    // 音调 0.5-2.0
  volume: number;   // 音量 0-1
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
 * @returns 音频文件路径
 */
export async function generateAudio(
  text: string,
  config: TtsConfig
): Promise<string> {
  if (!isElectronEnvironment()) {
    throw new Error(
      '此功能需要在 Electron 应用窗口中运行。\n' +
      '请使用 "npm run electron:dev" 启动应用。'
    );
  }

  try {
    const audioPath = await window.electronAPI.generateAudio(text, config);
    return audioPath;
  } catch (error) {
    throw new Error(`生成音频失败: ${error}`);
  }
}

/**
 * 获取可用发音人列表
 * @returns 发音人列表
 */
export async function getVoiceList(): Promise<VoiceInfo[]> {
  if (!isElectronEnvironment()) {
    // 如果不在 Electron 环境中，返回模拟数据
    return [
      {
        id: 'zhiwei',
        name: '解说-知韦(紧凑版)',
        gender: 'male',
        language: 'zh-CN',
        description: '专业解说风格，适合新闻、教育类内容',
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
  format: string = 'wav'
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
