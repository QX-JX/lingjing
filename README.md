# 灵境配音

一个专业的文字转语音（TTS）桌面应用，支持多发音人选择、SSML 标签插入（停顿、变速）、多音源混音（语音 + BGM）和本地音频文件导出。

## 技术栈

- **前端框架**: React 19 + TypeScript
- **桌面框架**: Electron
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **富文本编辑器**: Tiptap
- **TTS 引擎**: Edge TTS (@lixen/edge-tts)
- **音频处理**: FFmpeg
- **构建工具**: Vite

## 项目结构

```
灵境配音/
├── api/                    # API 接入文档和示例代码
├── docs/                   # 项目文档
├── python/                 # Python TTS 包装器
│   └── tts_wrapper.py      # TTS 核心服务
├── scripts/                # 开发脚本
├── tauri-app/              # 主应用目录
│   ├── src/                # React 源码
│   │   ├── components/     # React 组件
│   │   ├── services/       # 业务服务
│   │   ├── store/          # Zustand 状态管理
│   │   └── utils/          # 工具函数
│   ├── electron/           # Electron 主进程代码
│   ├── public/             # 静态资源
│   └── package.json        # 前端依赖配置
├── requirements.txt        # Python 依赖
└── package.json            # 根目录依赖配置
```

## 环境要求

- **Node.js**: >= 18.0.0
- **Python**: >= 3.8
- **npm**: >= 9.0.0

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd 灵境配音
```

### 2. 安装 Node.js 依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd tauri-app
npm install
cd ..
```

### 3. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

## 运行方法

### 开发模式

```bash
cd tauri-app
npm run dev
```

或者使用 Electron 开发模式（推荐）：

```bash
cd tauri-app
npm run electron:dev
```

### 构建应用

```bash
cd tauri-app

# 仅构建前端
npm run build

# 构建 Electron 应用（跳过 TypeScript 检查）
npm run electron:build:skip

# 完整构建（包含 TypeScript 检查）
npm run electron:build
```

构建产物将输出到 `tauri-app/release_v2_new/` 目录。

## 功能特性

- ✅ 多发音人选择（支持多种中文语音）
- ✅ SSML 标签支持（停顿、语速调整）
- ✅ 多音源混音（语音 + 背景音乐）
- ✅ 本地音频文件导出
- ✅ 富文本编辑器（支持格式化文本）
- ✅ 历史记录管理
- ✅ 字数统计（最大 5000 字）

## 注意事项

1. **首次运行**: 需要确保 Python 环境已正确配置，`tts_wrapper.py` 可以正常运行
2. **网络要求**: TTS 功能需要网络连接，使用 Edge TTS 服务
3. **音频文件**: 测试音频文件（`tests/*.mp3`）已排除在版本控制之外，如需测试请自行准备
4. **构建产物**: 所有构建产物（`dist/`、`build/`、`release*/`）已排除在版本控制之外
5. **环境变量**: 如有环境变量配置，请创建 `.env.local` 文件（已排除在版本控制之外）

## 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 样式优先使用 Tailwind CSS 实用类
- 图标统一使用 `lucide-react`
- 状态管理使用 Zustand

### 项目配置

- TypeScript 配置: `tauri-app/tsconfig.json`
- Vite 配置: `tauri-app/vite.config.ts`
- Tailwind 配置: `tauri-app/tailwind.config.js`
- Electron 构建配置: `tauri-app/package.json` 中的 `build` 字段

## 许可证

[待补充]

## 联系方式

[待补充]
