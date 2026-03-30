console.log('正在启动 Electron 主进程...');
const { app, BrowserWindow, ipcMain, dialog, protocol, shell, session } = require('electron');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const ttsService = require('./ttsService.cjs');
const historyStorage = require('./historyStorage.cjs');

// 注册特权协议 (必须在 app ready 之前)
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'media',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true
        }
    },
    {
        scheme: 'app',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true
        }
    }
]);

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

// 转发日志到渲染进程
function logToRenderer(level, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            mainWindow.webContents.send('main-process-log', { level, args: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            })});
        } catch (e) {
            // 忽略发送失败
        }
    }
    // 同时输出到控制台
    if (level === 'error') {
        console.error(...args);
    } else if (level === 'warn') {
        console.warn(...args);
    } else {
        console.log(...args);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: '灵境配音',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        frame: false, // 隐藏系统标题栏
        show: true,
        backgroundColor: '#FEF3E2', // 暖色背景
    });

    // 配置窗口的 session 代理设置（在窗口创建后立即设置）
    const windowSession = mainWindow.webContents.session;
    
    // 设置代理为直接连接，绕过系统代理
    windowSession.setProxy({
        proxyRules: 'direct', // 直接连接，不使用代理
        proxyBypassRules: '*', // 绕过所有代理规则
    }).then(() => {
        console.log('[Electron] 窗口代理设置已配置为直接连接');
    }).catch(err => {
        console.warn('[Electron] 设置窗口代理失败:', err.message);
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
            // 创建进度回调函数，通过事件发送进度更新
            const onProgress = (current, total, segmentText) => {
                try {
                    if (event.sender && !event.sender.isDestroyed()) {
                        const progressData = {
                            current,
                            total,
                            segmentText: segmentText || '',
                            percentage: Math.round((current / total) * 100)
                        };
                        console.log('[Main] 发送进度更新:', progressData);
                        event.sender.send('tts-progress', progressData);
                    } else {
                        console.warn('[Main] 无法发送进度更新: event.sender 无效');
                    }
                } catch (err) {
                    console.error('[Main] 发送进度更新失败:', err);
                }
            };
            
            const audioPath = await ttsService.generateAudio(text, config, onProgress);
            return audioPath;
        } catch (error) {
            throw new Error(`生成音频失败: ${error.message}`);
        }
    });

    ipcMain.handle('cancel-generate-audio', async () => {
        try {
            ttsService.cancelGenerateAudio();
            return true;
        } catch (error) {
            console.error('[Main] 取消生成失败:', error);
            return false;
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

    // 上传自定义音效
    ipcMain.handle('upload-custom-sound', async (event, fileData) => {
        try {
            const fs = require('fs').promises;
            const { buffer, originalName, size } = fileData;

            // 验证文件大小 (2MB)
            const maxSize = 2 * 1024 * 1024;
            if (size > maxSize) {
                throw new Error('文件大小不能超过 2MB');
            }

            // 验证文件类型
            if (!originalName.toLowerCase().endsWith('.mp3')) {
                throw new Error('仅支持 MP3 格式');
            }

            // 创建自定义音效目录
            // 开发环境: __dirname/../public/sounds/custom
            // 生产环境: app.getAppPath()/dist/sounds/custom
            let customSoundsDir;
            if (app.isPackaged) {
                customSoundsDir = path.join(app.getAppPath(), 'dist', 'sounds', 'custom');
            } else {
                customSoundsDir = path.join(__dirname, '..', 'public', 'sounds', 'custom');
            }
            await fs.mkdir(customSoundsDir, { recursive: true });

            // 生成唯一文件名
            const timestamp = Date.now();
            const fileName = `${timestamp}_${originalName}`;
            const filePath = path.join(customSoundsDir, fileName);

            // 写入文件
            const bufferData = Buffer.from(buffer);
            await fs.writeFile(filePath, bufferData);

            console.log(`[Main] 自定义音效上传成功: ${filePath}`);

            return {
                fileName,
                originalName,
                filePath
            };
        } catch (error) {
            console.error('[Main] 上传自定义音效失败:', error);
            throw new Error(`上传失败: ${error.message}`);
        }
    });

    // 删除自定义音效
    ipcMain.handle('delete-custom-sound', async (event, fileName) => {
        try {
            const fs = require('fs').promises;
            // 开发环境: __dirname/../public/sounds/custom
            // 生产环境: app.getAppPath()/dist/sounds/custom
            let customSoundsDir;
            if (app.isPackaged) {
                customSoundsDir = path.join(app.getAppPath(), 'dist', 'sounds', 'custom');
            } else {
                customSoundsDir = path.join(__dirname, '..', 'public', 'sounds', 'custom');
            }
            const filePath = path.join(customSoundsDir, fileName);

            await fs.unlink(filePath);
            console.log(`[Main] 自定义音效删除成功: ${filePath}`);
        } catch (error) {
            console.error('[Main] 删除自定义音效失败:', error);
            throw new Error(`删除失败: ${error.message}`);
        }
    });

    // 上传背景音乐
    ipcMain.handle('upload-background-music', async (event, fileData) => {
        try {
            const fs = require('fs').promises;
            const { buffer, originalName, size } = fileData;

            // 验证文件大小 (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (size > maxSize) {
                throw new Error('文件大小不能超过 10MB');
            }

            // 验证文件类型
            if (!originalName.toLowerCase().endsWith('.mp3')) {
                throw new Error('仅支持 MP3 格式');
            }

            // 创建自定义背景音乐目录
            // 开发环境: __dirname/../public/sounds/bgm/custom
            // 生产环境: app.asar.unpacked/dist/sounds/bgm/custom
            let customBgmDir;
            if (app.isPackaged) {
                // 生产环境：资源在 app.asar.unpacked/dist 目录中
                const appPath = app.getAppPath();
                const unpackedPath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
                customBgmDir = path.join(unpackedPath, 'dist', 'sounds', 'bgm', 'custom');
            } else {
                customBgmDir = path.join(__dirname, '..', 'public', 'sounds', 'bgm', 'custom');
            }
            await fs.mkdir(customBgmDir, { recursive: true });

            // 生成唯一文件名
            const timestamp = Date.now();
            const fileName = `${timestamp}_${originalName}`;
            const filePath = path.join(customBgmDir, fileName);

            // 写入文件
            const bufferData = Buffer.from(buffer);
            await fs.writeFile(filePath, bufferData);

            console.log(`[Main] 背景音乐上传成功: ${filePath}`);

            return {
                fileName,
                originalName,
                filePath
            };
        } catch (error) {
            console.error('[Main] 上传背景音乐失败:', error);
            throw new Error(`上传失败: ${error.message}`);
        }
    });

    // ==================== 历史记录相关 ====================

    // 保存历史记录
    ipcMain.handle('save-history-record', async (event, record) => {
        try {
            const savedRecord = await historyStorage.saveRecord(record);
            return savedRecord;
        } catch (error) {
            throw new Error(`保存历史记录失败: ${error.message}`);
        }
    });

    // 获取所有历史记录
    ipcMain.handle('get-all-history-records', async () => {
        try {
            return await historyStorage.getAllRecords();
        } catch (error) {
            throw new Error(`获取历史记录失败: ${error.message}`);
        }
    });

    // 根据 ID 获取单条记录
    ipcMain.handle('get-history-record', async (event, id) => {
        try {
            return await historyStorage.getRecordById(id);
        } catch (error) {
            throw new Error(`获取历史记录失败: ${error.message}`);
        }
    });

    // 删除历史记录
    ipcMain.handle('delete-history-record', async (event, id) => {
        try {
            return await historyStorage.deleteRecord(id);
        } catch (error) {
            throw new Error(`删除历史记录失败: ${error.message}`);
        }
    });

    // 清空所有历史记录
    ipcMain.handle('clear-all-history-records', async () => {
        try {
            return await historyStorage.clearAllRecords();
        } catch (error) {
            throw new Error(`清空历史记录失败: ${error.message}`);
        }
    });

    // 更新历史记录
    ipcMain.handle('update-history-record', async (event, id, updates) => {
        try {
            return await historyStorage.updateRecord(id, updates);
        } catch (error) {
            throw new Error(`更新历史记录失败: ${error.message}`);
        }
    });

    // 搜索历史记录
    ipcMain.handle('search-history-records', async (event, keyword) => {
        try {
            return await historyStorage.searchRecords(keyword);
        } catch (error) {
            throw new Error(`搜索历史记录失败: ${error.message}`);
        }
    });

    // ==================== 窗口控制相关 ====================

    // 最小化窗口
    ipcMain.handle('window-minimize', () => {
        if (mainWindow) {
            mainWindow.minimize();
        }
    });

    // 最大化/还原窗口
    ipcMain.handle('window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    // 关闭窗口
    ipcMain.handle('window-close', () => {
        if (mainWindow) {
            mainWindow.close();
        }
    });

    // 检查窗口是否最大化
    ipcMain.handle('window-is-maximized', () => {
        return mainWindow ? mainWindow.isMaximized() : false;
    });

    // 在系统默认浏览器中打开 URL
    ipcMain.handle('open-external-url', async (event, url) => {
        try {
            // 验证 URL
            if (!url || typeof url !== 'string' || !url.trim()) {
                const errorMsg = 'URL 为空或无效';
                console.error('[Main]', errorMsg);
                return { success: false, error: errorMsg };
            }

            // 确保 URL 包含协议
            let finalUrl = url.trim();
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = `https://${finalUrl}`;
            }

            // 验证 URL 格式
            try {
                new URL(finalUrl);
            } catch (urlError) {
                const errorMsg = `URL 格式无效: ${finalUrl}`;
                console.error('[Main]', errorMsg);
                return { success: false, error: errorMsg };
            }

            console.log('[Main] 在系统默认浏览器中打开 URL:', finalUrl);
            
            // 使用 shell.openExternal 在系统默认浏览器中打开
            await shell.openExternal(finalUrl);
            
            console.log('[Main] URL 已在系统浏览器中打开');
            return { success: true };
        } catch (error) {
            const errorMsg = error.message || '未知错误';
            console.error('[Main] 打开外部 URL 失败:', errorMsg, error);
            return { success: false, error: errorMsg };
        }
    });

    // 获取设备ID（机器码）
    ipcMain.handle('get-device-id', async () => {
        try {
            return getDeviceId();
        } catch (error) {
            console.error('[Main] 获取设备ID失败:', error);
            throw new Error(`获取设备ID失败: ${error.message}`);
        }
    });

    // ==================== 更新相关 ====================

    // 检查更新
    ipcMain.handle('check-for-update', async () => {
        try {
            const currentVersion = app.getVersion();
            const softwareId = '10033';
            const apiUrl = `http://software.kunqiongai.com:8000/api/v1/updates/check/?software=${softwareId}&version=${currentVersion}`;
            
            console.log(`[Main] Checking for update: ${apiUrl}`);
            
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Update check failed: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('[Main] Update check result:', data);
            
            return data;
        } catch (error) {
            console.error('[Main] Check for update failed:', error);
            throw new Error(`Check for update failed: ${error.message}`);
        }
    });

    // 开始更新
    ipcMain.handle('start-update', async (event, updateInfo) => {
        try {
            const { download_url, package_hash } = updateInfo;
            if (!download_url) {
                throw new Error('Missing download_url');
            }

            // Determine updater path
            let updaterPath;
            if (app.isPackaged) {
                // In production, updater.exe is in the resources directory
                updaterPath = path.join(process.resourcesPath, 'updater.exe');
            } else {
                // In development, it's in the project root
                updaterPath = path.join(__dirname, '..', 'updater.exe');
            }
            
            // In development, we can't really update electron.exe
            if (!app.isPackaged) {
                console.log('[Main] Development mode: Mocking update start');
                console.log('Updater Path:', updaterPath);
                console.log('Update Info:', updateInfo);
                return { success: true, message: 'Development mode: Update simulated' };
            }

            const appDir = path.dirname(app.getPath('exe'));
            const exeName = path.basename(app.getPath('exe'));
            const pid = process.pid;

            const args = [
                '--url', download_url,
                '--dir', appDir,
                '--exe', exeName,
                '--pid', pid.toString()
            ];
            
            if (package_hash) {
                args.push('--hash', package_hash);
            }

            console.log(`[Main] Starting updater: ${updaterPath} ${args.join(' ')}`);

            const subprocess = spawn(updaterPath, args, {
                detached: true,
                stdio: 'ignore'
            });

            subprocess.unref();
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('[Main] Start update failed:', error);
            throw new Error(`Start update failed: ${error.message}`);
        }
    });
}

/**
 * 获取设备ID（机器码）
 * 根据 Python 示例代码实现，组合 CPU、MAC、主板信息并哈希
 */
function getDeviceId() {
    const hardwareInfos = [];
    const platform = os.platform();

    try {
        // 1. 获取 CPU 序列号
        let cpuSerial = null;
        try {
            if (platform === 'win32') {
                // Windows: wmic cpu get ProcessorId
                const result = execSync('wmic cpu get ProcessorId', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                const lines = result.trim().split('\n');
                if (lines.length >= 2) {
                    cpuSerial = lines[1].trim();
                }
            } else if (platform === 'linux') {
                // Linux: 读取 /proc/cpuinfo
                const fs = require('fs');
                const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
                for (const line of cpuInfo.split('\n')) {
                    if (line.startsWith('serial')) {
                        cpuSerial = line.split(':')[1].trim();
                        break;
                    }
                }
            } else if (platform === 'darwin') {
                // macOS: sysctl -n machdep.cpu.core_count
                const result = execSync('sysctl -n machdep.cpu.core_count', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                cpuSerial = result.trim();
            }
        } catch (error) {
            console.warn('[Main] 获取CPU信息失败:', error.message);
        }

        if (cpuSerial) {
            hardwareInfos.push(cpuSerial);
        }

        // 2. 获取 MAC 地址
        const networkInterfaces = os.networkInterfaces();
        let macAddress = null;
        for (const name of Object.keys(networkInterfaces)) {
            const interfaces = networkInterfaces[name];
            if (interfaces) {
                for (const iface of interfaces) {
                    // 跳过内部/虚拟接口
                    if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                        macAddress = iface.mac;
                        break;
                    }
                }
                if (macAddress) break;
            }
        }

        if (macAddress) {
            hardwareInfos.push(macAddress);
        }

        // 3. 获取主板序列号（Windows）
        if (platform === 'win32') {
            try {
                const result = execSync('wmic baseboard get SerialNumber', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
                const lines = result.trim().split('\n');
                if (lines.length >= 2) {
                    const boardSerial = lines[1].trim();
                    if (boardSerial) {
                        hardwareInfos.push(boardSerial);
                    }
                }
            } catch (error) {
                console.warn('[Main] 获取主板序列号失败:', error.message);
            }
        }

        // 4. 组合所有信息并哈希
        if (hardwareInfos.length === 0) {
            // 如果没有获取到硬件信息，使用主机名作为后备
            hardwareInfos.push(os.hostname());
        }

        const combined = hardwareInfos.join('|');
        const machineCode = crypto.createHash('sha256').update(combined, 'utf-8').digest('hex');

        console.log('[Main] 设备ID生成成功');
        return machineCode;
    } catch (error) {
        console.error('[Main] 生成设备ID失败:', error);
        // 如果所有方法都失败，使用主机名生成一个后备ID
        const fallback = crypto.createHash('sha256').update(os.hostname(), 'utf-8').digest('hex');
        return fallback;
    }
}

// 应用启动
app.whenReady().then(() => {
    // 配置默认 session 以处理代理问题
    // 禁用代理或允许直接连接，避免 ERR_PROXY_CONNECTION_FAILED 错误
    const defaultSession = session.defaultSession;
    
    // 设置默认 session 的代理为直接连接
    defaultSession.setProxy({
        proxyRules: 'direct', // 直接连接，不使用代理
        proxyBypassRules: '*', // 绕过所有代理规则
    }).then(() => {
        console.log('[Electron] 默认 session 代理设置已配置为直接连接');
    }).catch(err => {
        console.warn('[Electron] 设置默认 session 代理失败:', err.message);
    });
    
    console.log('[Main] 应用已准备就绪，开始注册协议...');
    
    // 注册自定义协议用于读取本地文件
    const mediaProtocolResult = protocol.registerFileProtocol('media', (request, callback) => {
        try {
            const urlObj = new URL(request.url);
            let pathname = decodeURIComponent(urlObj.pathname);

            // 如果 url 类似 media://C:/Users... 则 host 是 c，pathname 是 /Users... (host 被作为盘符)
            // 如果 url 类似 media:///C:/Users... 则 host 是空，pathname 是 /C:/Users...

            // 修正 Windows 路径
            if (process.platform === 'win32') {
                // 如果有 host，且看起来像盘符（单个字母），把它拼回到路径前
                if (urlObj.hostname && urlObj.hostname.length === 1) {
                    pathname = `${urlObj.hostname}:${pathname}`;
                }
                // 如果路径以 / 开头（例如 /C:/...），去除开头的 /
                else if (pathname.startsWith('/')) {
                    pathname = pathname.slice(1);
                }
            }

            return callback(pathname);
        } catch (error) {
            console.error('Failed to handle media protocol', error);
            // Fallback for simple cases or errors
            const url = request.url.replace('media://', '');
            return callback(decodeURIComponent(url));
        }
    });

    // 注册自定义协议用于访问应用资源（头像、音频等）
    // 使用 registerBufferProtocol 以更好地支持音频文件
    // 对于音频文件，使用 Buffer 方式更可靠
    const appProtocolResult = protocol.registerBufferProtocol('app', (request, callback) => {
        try {
            const urlObj = new URL(request.url);
            
            // 处理 URL 解析：
            // app://sounds/effects/applause.mp3 -> hostname: 'sounds', pathname: '/effects/applause.mp3'
            // app:///sounds/effects/applause.mp3 -> hostname: '', pathname: '/sounds/effects/applause.mp3'
            // 我们需要将 hostname 和 pathname 组合起来
            let resourcePath = '';
            
            // 如果有 hostname，将其作为路径的一部分
            if (urlObj.hostname && urlObj.hostname.trim()) {
                resourcePath = urlObj.hostname;
            }
            
            // 添加 pathname（去除开头的斜杠）
            let pathname = decodeURIComponent(urlObj.pathname).replace(/^\/+/, '');
            if (pathname) {
                if (resourcePath) {
                    resourcePath = `${resourcePath}/${pathname}`;
                } else {
                    resourcePath = pathname;
                }
            }

            // 构建完整路径
            let fullPath;
            const fs = require('fs');
            
            if (app.isPackaged) {
                // 生产环境
                // 1. 优先检查 app.asar.unpacked (通过 asarUnpack 打包的资源，如 sounds)
                const appPath = app.getAppPath();
                // app.getAppPath() 在生产环境中返回类似: C:\Users\...\app.asar
                // 需要找到 app.asar 的父目录，然后拼接 app.asar.unpacked
                let unpackedPath;
                if (appPath.endsWith('app.asar')) {
                    // 如果路径以 app.asar 结尾，替换为 app.asar.unpacked
                    unpackedPath = appPath.replace(/app\.asar$/, 'app.asar.unpacked');
                } else {
                    // 否则，在 app.asar 的父目录下查找 app.asar.unpacked
                    unpackedPath = path.join(path.dirname(appPath), 'app.asar.unpacked');
                }
                
                // 尝试多个可能的路径
                const possiblePaths = [
                    path.join(unpackedPath, 'dist', resourcePath),  // app.asar.unpacked/dist/sounds/...
                    path.join(unpackedPath, resourcePath),          // app.asar.unpacked/sounds/... (如果 dist 没有复制)
                    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', resourcePath), // resources/app.asar.unpacked/dist/...
                    path.join(process.resourcesPath, resourcePath), // resources/sounds/...
                    path.join(appPath, 'dist', resourcePath),      // app.asar/dist/... (在 asar 中)
                ];
                
                for (let i = 0; i < possiblePaths.length; i++) {
                    const testPath = possiblePaths[i];
                    if (fs.existsSync(testPath)) {
                        fullPath = testPath;
                        break;
                    }
                }
            } else {
                // 开发环境
                // 优先检查 dist 目录（如果已构建）
                const distPath = path.join(__dirname, '..', 'dist', resourcePath);
                if (fs.existsSync(distPath)) {
                    fullPath = distPath;
                } else {
                    // 如果 dist 不存在，使用 public 目录（开发模式）
                    fullPath = path.join(__dirname, '..', 'public', resourcePath);
                }
            }

            if (!fs.existsSync(fullPath)) {
                logToRenderer('error', `[App Protocol] ❌ 文件未找到: ${fullPath}`);
                logToRenderer('error', `[App Protocol] 请求的 URL: ${request.url}`);
                logToRenderer('error', `[App Protocol] 资源路径: ${resourcePath}`);
                logToRenderer('error', `[App Protocol] 是否打包: ${app.isPackaged}`);
                logToRenderer('error', `[App Protocol] App 路径: ${app.getAppPath()}`);
                logToRenderer('error', `[App Protocol] Resources 路径: ${process.resourcesPath}`);
                if (app.isPackaged) {
                    const unpackedPath = app.getAppPath().replace(/app\.asar$/, 'app.asar.unpacked');
                    logToRenderer('error', `[App Protocol] Unpacked 路径: ${unpackedPath}`);
                    // 列出 unpacked 目录内容（如果存在）
                    if (fs.existsSync(unpackedPath)) {
                        try {
                            const unpackedContents = fs.readdirSync(unpackedPath, { recursive: true });
                            logToRenderer('error', `[App Protocol] Unpacked 目录内容:`, unpackedContents);
                        } catch (e) {
                            logToRenderer('error', `[App Protocol] 无法读取 unpacked 目录:`, e.message);
                        }
                    }
                } else {
                    // 开发环境：列出 public 目录内容
                    const publicDir = path.join(__dirname, '..', 'public');
                    if (fs.existsSync(publicDir)) {
                        try {
                            const publicContents = fs.readdirSync(publicDir, { recursive: true });
                            logToRenderer('error', `[App Protocol] Public 目录内容:`, publicContents);
                        } catch (e) {
                            logToRenderer('error', `[App Protocol] 无法读取 public 目录:`, e.message);
                        }
                    }
                }
                return callback({ error: -2 }); // FILE_NOT_FOUND
            }

            // 确定 MIME 类型
            let mimeType = 'application/octet-stream';
            const ext = path.extname(fullPath).toLowerCase();
            const mimeTypes = {
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.m4a': 'audio/mp4',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp'
            };
            if (mimeTypes[ext]) {
                mimeType = mimeTypes[ext];
            }

            // 使用 registerBufferProtocol 读取文件并返回 Buffer
            try {
                const fileBuffer = fs.readFileSync(fullPath);
                
                callback({
                    statusCode: 200,
                    headers: {
                        'Content-Type': mimeType,
                        'Access-Control-Allow-Origin': '*',
                        'Content-Length': fileBuffer.length.toString()
                    },
                    data: fileBuffer
                });
            } catch (readError) {
                logToRenderer('error', `[App Protocol] 读取文件失败:`, readError.message);
                callback({ error: -2 }); // FILE_NOT_FOUND
            }
        } catch (error) {
            logToRenderer('error', '[App Protocol] ❌ 处理请求失败:', {
                url: request.url,
                error: error.message,
                stack: error.stack
            });
            callback({ error: -2 }); // FILE_NOT_FOUND
        }
    });
    
    // 验证协议注册是否成功
    if (!mediaProtocolResult) {
        console.error('[Main] ❌ media 协议注册失败！');
        logToRenderer('error', '[Main] ❌ media 协议注册失败！');
    } else {
        console.log('[Main] ✅ media 协议注册成功');
        logToRenderer('log', '[Main] ✅ media 协议注册成功');
    }
    
    if (!appProtocolResult) {
        console.error('[Main] ❌ app 协议注册失败！');
        logToRenderer('error', '[Main] ❌ app 协议注册失败！');
    } else {
        console.log('[Main] ✅ app 协议注册成功');
        logToRenderer('log', '[Main] ✅ app 协议注册成功');
    }

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
