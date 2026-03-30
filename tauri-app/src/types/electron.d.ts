// Electron API 类型定义

export interface ElectronAPI {
    // TTS 相关
    generateAudio: (text: string, config: TtsConfig) => Promise<string>;
    cancelGenerateAudio?: () => Promise<boolean>;
    getVoiceList: () => Promise<VoiceInfo[]>;
    calculateDuration: (text: string, speed: number) => Promise<number>;
    exportAudio: (sourcePath: string, targetPath: string, format: string) => Promise<string>;

    // Type definitions for Phase 4 features
    mixBackgroundMusic: (voicePath: string, bgmPath: string, options: MixOptions) => Promise<string>;
    getPresetBgmList: () => Promise<BgmInfo[]>;
    importTextFile: (filePath: string) => Promise<string>;
    exportProject: (projectData: any, targetPath: string) => Promise<string>;
    importProject: (filePath: string) => Promise<any>;

    // 自定义音效
    uploadCustomSound: (fileData: CustomSoundUploadData) => Promise<CustomSoundUploadResult>;
    deleteCustomSound: (fileName: string) => Promise<void>;

    // 背景音乐
    uploadBackgroundMusic: (fileData: CustomSoundUploadData) => Promise<CustomSoundUploadResult>;

    // 对话框
    showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
    showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;

    // 历史记录
    saveHistoryRecord: (record: HistoryRecordInput) => Promise<HistoryRecord>;
    getAllHistoryRecords: () => Promise<HistoryRecord[]>;
    getHistoryRecord: (id: string) => Promise<HistoryRecord | null>;
    deleteHistoryRecord: (id: string) => Promise<boolean>;
    clearAllHistoryRecords: () => Promise<boolean>;
    updateHistoryRecord: (id: string, updates: Partial<HistoryRecordInput>) => Promise<HistoryRecord | null>;
    searchHistoryRecords: (keyword: string) => Promise<HistoryRecord[]>;

    // 窗口控制
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
    windowIsMaximized: () => Promise<boolean>;

    // 打开外部 URL（在系统默认浏览器中）
    openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

    // 获取设备ID（机器码）
    getDeviceId: () => Promise<string>;

    // 主进程日志监听
    onMainProcessLog?: (callback: (data: { level: string; args: string[] }) => void) => void;
    removeMainProcessLogListener?: () => void;

    // TTS 进度监听
    onTtsProgress?: (callback: (data: TtsProgressData) => void) => void;
    removeTtsProgressListener?: () => void;

    // 更新相关
    checkForUpdate: () => Promise<UpdateCheckResult>;
    startUpdate: (updateInfo: UpdateInfo) => Promise<{ success: boolean; message?: string }>;
}

export interface UpdateCheckResult {
    has_update: boolean;
    version?: string;
    update_log?: string;
    download_url?: string;
    package_size?: number;
    package_hash?: string;
    is_mandatory?: boolean;
    release_date?: string;
}

export interface UpdateInfo {
    download_url: string;
    package_hash?: string;
}

export interface CustomSoundUploadData {
    buffer: number[];
    originalName: string;
    size: number;
}

export interface CustomSoundUploadResult {
    fileName: string;
    originalName: string;
    filePath: string;
}

export interface MixOptions {
    bgmVolume?: number;
    voiceVolume?: number;
}

export interface BgmInfo {
    id: string;
    name: string;
    path: string | null;
}

export interface TtsConfig {
    voice_id: string;
    speed: number;
    pitch: number;
    volume: number;
}

export interface VoiceInfo {
    id: string;
    name: string;
    gender: string;
    language: string;
    description: string;
}

export interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: FileFilter[];
}

export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    buttonLabel?: string;
    filters?: FileFilter[];
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface FileFilter {
    name: string;
    extensions: string[];
}

export interface SaveDialogResult {
    canceled: boolean;
    filePath?: string;
}

export interface OpenDialogResult {
    canceled: boolean;
    filePaths: string[];
}

// 历史记录相关类型
export interface HistoryRecordInput {
    text: string;
    title?: string;
    voiceConfig?: any;
    audioConfig?: any;
    bgmConfig?: any;
}

export interface HistoryRecord extends HistoryRecordInput {
    id: string;
    timestamp: number;
    characterCount: number;
}

export interface TtsProgressData {
    current: number;
    total: number;
    segmentText: string;
    percentage: number;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
