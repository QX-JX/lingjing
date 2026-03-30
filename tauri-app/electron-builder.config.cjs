const path = require('path');

const platform = process.platform;
const arch = process.arch;
const isWindows = platform === 'win32';

const ffmpegBinaryName = 'ffmpeg.exe';
const ttsWrapperBinaryName = 'tts_wrapper.exe';

const buildResource = (...segments) => path.join(__dirname, 'build-resources', ...segments);

const extraResources = [
  {
    from: buildResource('bin', platform, arch, ffmpegBinaryName),
    to: ffmpegBinaryName,
  },
  {
    from: buildResource('bin', platform, arch, ttsWrapperBinaryName),
    to: ttsWrapperBinaryName,
  },
];

if (isWindows) {
  extraResources.unshift({
    from: path.join(__dirname, 'updater.exe'),
    to: 'updater.exe',
  });
}

module.exports = {
  appId: 'com.lingjing.peiyin',
  productName: '\u7075\u5883\u914d\u97f3',
  directories: {
    output: 'release_v2_new',
    buildResources: 'build-resources',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    '!electron/**/*.md',
    '!**/*.map',
  ],
  asarUnpack: [
    'dist/sounds/**/*',
    'dist/assets/**/*.png',
    'dist/assets/**/*.jpg',
    'dist/assets/**/*.jpeg',
  ],
  extraResources,
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  publish: null,
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: path.join(__dirname, '..', 'icon.ico'),
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '\u7075\u5883\u914d\u97f3',
  },
  linux: {
    target: ['AppImage', 'tar.gz'],
    category: 'AudioVideo',
    icon: path.join(__dirname, 'public', 'app-icon.png'),
  },
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.music',
    icon: path.join(__dirname, 'public', 'app-icon.png'),
    darkModeSupport: true,
  },
};
