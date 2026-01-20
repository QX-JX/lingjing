// Electron API 类型定义

export interface ElectronAPI {
    // TTS 相关
    generateAudio: (text: string, config: TtsConfig) => Promise<string>;
    getVoiceList: () => Promise<VoiceInfo[]>;
    calculateDuration: (text: string, speed: number) => Promise<number>;
    exportAudio: (sourcePath: string, targetPath: string, format: string) => Promise<string>;

    // Type definitions for Phase 4 features
    mixBackgroundMusic: (voicePath: string, bgmPath: string, options: MixOptions) => Promise<string>;
    getPresetBgmList: () => Promise<BgmInfo[]>;
    importTextFile: (filePath: string) => Promise<string>;
    exportProject: (projectData: any, targetPath: string) => Promise<string>;
    importProject: (filePath: string) => Promise<any>;

    // 对话框
    showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>;
    showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>;
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

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
