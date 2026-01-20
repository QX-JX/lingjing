console.log('正在启动 Electron 主进程...');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ttsService = require('./ttsService.cjs');

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'default',
        show: true,
        backgroundColor: '#FEF3E2', // 暖色背景
    });

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    const devServerUrl = 'http://127.0.0.1:1420';

    // 重试加载函数
    const loadWithRetry = (url, retries = 5, delay = 1000) => {
        console.log(`尝试加载: ${url} (剩余重试次数: ${retries})`);

        mainWindow.loadURL(url).then(() => {
            console.log('页面加载成功!');
        }).catch(err => {
            console.error('加载失败:', err.message);
            if (retries > 0) {
                console.log(`${delay}ms 后重试...`);
                setTimeout(() => loadWithRetry(url, retries - 1, delay), delay);
            } else {
                // 所有重试失败，显示错误页面
                console.error('所有重试都失败了，显示错误页面');
                mainWindow.loadURL(`data:text/html;charset=utf-8,
                    <html>
                    <head><title>加载失败</title></head>
                    <body style="font-family: sans-serif; padding: 40px; background: #FEF3E2;">
                        <h1 style="color: #F97316;">⚠️ 无法连接到开发服务器</h1>
                        <p>Electron 无法连接到 <code>${url}</code></p>
                        <p>错误信息: <code>${err.message}</code></p>
                        <h2>请确保:</h2>
                        <ol>
                            <li>Vite 开发服务器正在运行 (<code>npm run dev</code>)</li>
                            <li>服务器监听在 127.0.0.1:1420</li>
                        </ol>
                        <button onclick="location.reload()" style="padding: 10px 20px; background: #F97316; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            重试
                        </button>
                    </body>
                    </html>
                `);
            }
        });
    };

    if (isDev) {
        // 开发模式：加载 Vite 开发服务器
        loadWithRetry(devServerUrl);
        // 打开开发者工具
        mainWindow.webContents.openDevTools();
    } else {
        // 生产模式：加载打包后的文件
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 注册 IPC 处理程序
function registerIpcHandlers() {
    // 生成音频
    ipcMain.handle('generate-audio', async (event, text, config) => {
        try {
            const audioPath = await ttsService.generateAudio(text, config);
            return audioPath;
        } catch (error) {
            throw new Error(`生成音频失败: ${error.message}`);
        }
    });

    // 获取发音人列表
    ipcMain.handle('get-voice-list', async () => {
        return ttsService.getVoiceList();
    });

    // 计算时长
    ipcMain.handle('calculate-duration', async (event, text, speed) => {
        return ttsService.calculateDuration(text, speed);
    });

    // 导出音频 (支持 WAV 和 MP3)
    ipcMain.handle('export-audio', async (event, sourcePath, targetPath, format) => {
        try {
            const exportedPath = await ttsService.exportAudio(sourcePath, targetPath, format);
            return exportedPath;
        } catch (error) {
            throw new Error(`导出音频失败: ${error.message}`);
        }
    });

    // 混合背景音乐
    ipcMain.handle('mix-background-music', async (event, voicePath, bgmPath, options) => {
        try {
            const mixedPath = await ttsService.mixBackgroundMusic(voicePath, bgmPath, options);
            return mixedPath;
        } catch (error) {
            throw new Error(`混合背景音乐失败: ${error.message}`);
        }
    });

    // 导入文本文件
    ipcMain.handle('import-text-file', async (event, filePath) => {
        try {
            const content = await ttsService.importTextFile(filePath);
            return content;
        } catch (error) {
            throw new Error(`导入文本失败: ${error.message}`);
        }
    });

    // 导出项目
    ipcMain.handle('export-project', async (event, projectData, targetPath) => {
        try {
            const exportedPath = await ttsService.exportProject(projectData, targetPath);
            return exportedPath;
        } catch (error) {
            throw new Error(`导出项目失败: ${error.message}`);
        }
    });

    // 导入项目
    ipcMain.handle('import-project', async (event, filePath) => {
        try {
            const projectData = await ttsService.importProject(filePath);
            return projectData;
        } catch (error) {
            throw new Error(`导入项目失败: ${error.message}`);
        }
    });

    // 获取预设 BGM 列表
    ipcMain.handle('get-preset-bgm-list', async () => {
        return ttsService.getPresetBgmList();
    });

    // 显示保存对话框
    ipcMain.handle('show-save-dialog', async (event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    });

    // 显示打开对话框
    ipcMain.handle('show-open-dialog', async (event, options) => {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    });
}

// 应用启动
app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时退出应用 (macOS 除外)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
