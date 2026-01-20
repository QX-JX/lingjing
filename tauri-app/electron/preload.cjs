const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // TTS 相关
    generateAudio: (text, config) => ipcRenderer.invoke('generate-audio', text, config),
    getVoiceList: () => ipcRenderer.invoke('get-voice-list'),
    calculateDuration: (text, speed) => ipcRenderer.invoke('calculate-duration', text, speed),
    exportAudio: (sourcePath, targetPath, format) => ipcRenderer.invoke('export-audio', sourcePath, targetPath, format),

    // 音频处理
    mixBackgroundMusic: (voicePath, bgmPath, options) => ipcRenderer.invoke('mix-background-music', voicePath, bgmPath, options),
    getPresetBgmList: () => ipcRenderer.invoke('get-preset-bgm-list'),

    // 文件导入导出
    importTextFile: (filePath) => ipcRenderer.invoke('import-text-file', filePath),
    exportProject: (projectData, targetPath) => ipcRenderer.invoke('export-project', projectData, targetPath),
    importProject: (filePath) => ipcRenderer.invoke('import-project', filePath),

    // 对话框
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
});

// 类型定义 (供 TypeScript 使用)
// window.electronAPI 类型在 src/types/electron.d.ts 中定义
