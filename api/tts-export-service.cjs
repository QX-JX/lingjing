const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const childProcess = require('child_process');
const { createRequire } = require('module');

const repoRoot = path.resolve(__dirname, '..');
const tauriRoot = path.join(repoRoot, 'tauri-app');
const desktopTtsServicePath = path.join(tauriRoot, 'electron', 'ttsService.cjs');
const desktopRequire = createRequire(desktopTtsServicePath);

let desktopTtsService = null;
let resolvedPythonRunner = null;

const WEB_BGM_TO_DESKTOP_NAME = {
  'finding-myself.mp3': 'finding myself.mp3',
  'forest-walk.mp3': 'forest walk.mp3',
  'tears-of-joy.mp3': 'tears of joy.mp3',
  'valley-sunset.mp3': 'valley sunset.mp3',
};

function getUserDataDir() {
  const dir = path.join(repoRoot, '.web-export-runtime');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createElectronAppShim() {
  return {
    isPackaged: false,
    getPath(name) {
      if (name === 'userData') {
        return getUserDataDir();
      }
      return getUserDataDir();
    },
    getAppPath() {
      return tauriRoot;
    },
  };
}

function canRunPython(command, prefixArgs = []) {
  try {
    const result = childProcess.spawnSync(
      command,
      [...prefixArgs, '-c', 'import edge_tts,sys;print(sys.executable)'],
      {
        cwd: repoRoot,
        timeout: 10000,
        windowsHide: true,
        encoding: 'utf8',
      }
    );
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolvePythonRunner() {
  if (resolvedPythonRunner) return resolvedPythonRunner;

  const envPython = process.env.TTS_EXPORT_PYTHON;
  const venvPython = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');
  const candidates = [
    envPython ? { command: envPython, prefixArgs: [] } : null,
    fs.existsSync(venvPython) ? { command: venvPython, prefixArgs: [] } : null,
    { command: 'python', prefixArgs: [] },
    { command: 'py', prefixArgs: ['-3'] },
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (canRunPython(candidate.command, candidate.prefixArgs)) {
      resolvedPythonRunner = candidate;
      return resolvedPythonRunner;
    }
  }

  resolvedPythonRunner = { command: envPython || 'python', prefixArgs: [] };
  return resolvedPythonRunner;
}

function loadDesktopTtsService() {
  if (desktopTtsService) return desktopTtsService;

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return { app: createElectronAppShim() };
    }
    if (request === 'child_process') {
      return {
        ...childProcess,
        spawn(command, args, options) {
          if (command === 'python') {
            const runner = resolvePythonRunner();
            return childProcess.spawn(runner.command, [...runner.prefixArgs, ...args], options);
          }
          return childProcess.spawn(command, args, options);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete desktopRequire.cache[desktopTtsServicePath];
    desktopTtsService = desktopRequire(desktopTtsServicePath);
    return desktopTtsService;
  } finally {
    Module._load = originalLoad;
  }
}

function sendJson(res, data, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType = 'audio/mpeg') {
  const fileName = path.basename(filePath);
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

  const stream = fs.createReadStream(filePath);
  stream.on('error', (error) => {
    if (!res.headersSent) {
      sendJson(res, { code: 0, msg: error.message || '读取导出文件失败' }, 500);
    } else {
      res.destroy(error);
    }
  });
  stream.on('close', () => {
    fs.promises.unlink(filePath).catch(() => {});
  });
  stream.pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolvePresetMediaPath(relativePath) {
  const normalized = relativePath.replace(/^\/+/, '');
  const directPath = path.join(tauriRoot, 'public', normalized);
  if (fs.existsSync(directPath)) return directPath;

  const fileName = path.basename(normalized);
  const mappedName = WEB_BGM_TO_DESKTOP_NAME[fileName];
  if (mappedName) {
    const mappedPath = path.join(path.dirname(directPath), mappedName);
    if (fs.existsSync(mappedPath)) return mappedPath;
  }

  return directPath;
}

function normalizeBgmPath(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (fs.existsSync(trimmed)) return trimmed;

  if (trimmed.startsWith('/sounds/')) {
    return resolvePresetMediaPath(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.pathname.startsWith('/sounds/')) {
      return resolvePresetMediaPath(url.pathname);
    }
  } catch {
    // Ignore invalid URL and fall through.
  }

  return trimmed;
}

function normalizeConfig(payload) {
  const rawConfig = payload && typeof payload.config === 'object' && payload.config ? payload.config : payload || {};
  return {
    voice_id: String(rawConfig.voice_id || payload.voice_id || 'zhiwei'),
    speed: toNumber(rawConfig.speed ?? payload.speed, 1),
    pitch: toNumber(rawConfig.pitch ?? payload.pitch, 1),
    volume: toNumber(rawConfig.volume ?? payload.volume, 1),
    bgmPath: normalizeBgmPath(rawConfig.bgmPath ?? payload.bgmPath),
    bgmVolume: toNumber(rawConfig.bgmVolume ?? payload.bgmVolume, 0.3),
  };
}

async function handleTtsExportRequest(req, res) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, { code: 0, msg: 'Method Not Allowed' }, 405);
      return;
    }

    const rawBody = await readBody(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const text = String(payload.text || '').trim();
    if (!text) {
      sendJson(res, { code: 0, msg: '导出文本不能为空' }, 400);
      return;
    }

    const service = loadDesktopTtsService();
    const config = normalizeConfig(payload);
    const outputPath = await service.generateAudio(text, config);

    if (!outputPath || !fs.existsSync(outputPath)) {
      sendJson(res, { code: 0, msg: '导出失败：未生成音频文件' }, 500);
      return;
    }

    const format = String(payload.format || 'mp3').toLowerCase();
    const contentType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
    sendFile(res, outputPath, contentType);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, { code: 0, msg: message || '导出失败' }, 500);
  }
}

module.exports = {
  handleTtsExportRequest,
  loadDesktopTtsService,
};
