const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // TTS 相关
    generateAudio: (text, config) => ipcRenderer.invoke('generate-audio', text, config),
    cancelGenerateAudio: () => ipcRenderer.invoke('cancel-generate-audio'),
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

    // 自定义音效
    uploadCustomSound: (fileData) => ipcRenderer.invoke('upload-custom-sound', fileData),
    deleteCustomSound: (fileName) => ipcRenderer.invoke('delete-custom-sound', fileName),

    // 背景音乐
    uploadBackgroundMusic: (fileData) => ipcRenderer.invoke('upload-background-music', fileData),

    // 对话框
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

    // 历史记录
    saveHistoryRecord: (record) => ipcRenderer.invoke('save-history-record', record),
    getAllHistoryRecords: () => ipcRenderer.invoke('get-all-history-records'),
    getHistoryRecord: (id) => ipcRenderer.invoke('get-history-record', id),
    deleteHistoryRecord: (id) => ipcRenderer.invoke('delete-history-record', id),
    clearAllHistoryRecords: () => ipcRenderer.invoke('clear-all-history-records'),
    updateHistoryRecord: (id, updates) => ipcRenderer.invoke('update-history-record', id, updates),
    searchHistoryRecords: (keyword) => ipcRenderer.invoke('search-history-records', keyword),

    // 窗口控制
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
    windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

    // 打开外部 URL（在系统默认浏览器中）
    openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),

    // 获取设备ID（机器码）
    getDeviceId: () => ipcRenderer.invoke('get-device-id'),

    // 监听主进程日志
    onMainProcessLog: (callback) => {
        ipcRenderer.on('main-process-log', (event, data) => callback(data));
    },
    removeMainProcessLogListener: () => {
        ipcRenderer.removeAllListeners('main-process-log');
    },

    // 监听 TTS 进度更新
    onTtsProgress: (callback) => {
        ipcRenderer.on('tts-progress', (event, data) => callback(data));
    },
    removeTtsProgressListener: () => {
        ipcRenderer.removeAllListeners('tts-progress');
    },

    // 更新相关
    checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
    startUpdate: (updateInfo) => ipcRenderer.invoke('start-update', updateInfo),
});

// 类型定义 (供 TypeScript 使用)
// window.electronAPI 类型在 src/types/electron.d.ts 中定义
