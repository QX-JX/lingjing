# 发音人 TTS API 映射表

本文档列出了应用中六个发音人对应的 TTS API 音源信息。

## 发音人映射关系

### 1. 云希 (男) —— 活泼灵动
- **应用内ID**: `zhiwei`
- **显示名称**: 云希 (男)
- **Edge TTS Voice Name**: `zh-CN-YunxiNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 男
- **语言**: zh-CN (简体中文)
- **风格**: 阳光、活泼、富有朝气。声音听起来像是一个青少年或充满活力的年轻人。
- **适用场景**: 动画旁白、短视频讲解（特别是生活类、游戏类）、小说中的少年角色、轻松的教学视频。

### 2. 晓晓 (女) —— 全能情感
- **应用内ID**: `xiaoyu`
- **显示名称**: 晓晓 (女)
- **Edge TTS Voice Name**: `zh-CN-XiaoxiaoNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 女
- **语言**: zh-CN (简体中文)
- **风格**: 微软的"当家花旦"，音质温婉、亲切、自然。她是功能最强大的型号，支持多种情绪（如：开心、悲伤、愤怒、恐惧、低语等）。
- **适用场景**: 有声小说（能分饰多角）、影视解说、情感类电台、客服机器人、长文本阅读。

### 3. 云野 / 云扬 (男) —— 专业稳重
- **应用内ID**: `xiaofeng`
- **显示名称**: 云野 (男)
- **Edge TTS Voice Name**: `zh-CN-YunyangNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 男
- **语言**: zh-CN (简体中文)
- **风格**: 雄浑、专业、有磁性。语调非常接近传统广播电台的新闻主播，给人一种权威感和信任感。
- **适用场景**: 新闻播报、纪录片旁白、企业宣传片、严肃的学术讲座、时政解说。

### 4. 晓伊 (女) —— 温柔甜美
- **应用内ID**: `xiaomei`
- **显示名称**: 晓伊 (女)
- **Edge TTS Voice Name**: `zh-CN-XiaoyiNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 女
- **语言**: zh-CN (简体中文)
- **风格**: 声音清脆、甜美、有礼貌，听起来像是一位专业的服务人员或知心大姐姐。
- **适用场景**: 在线客服、语音助理、儿童故事、商场广播、生活贴士提醒。

### 5. 云健 (男) —— 激情澎湃
- **应用内ID**: `yunjian`
- **显示名称**: 云健 (男)
- **Edge TTS Voice Name**: `zh-CN-YunjianNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 男
- **语言**: zh-CN (简体中文)
- **风格**: 语速较快，充满力量感和运动感。声音听起来非常亢奋，极具感染力。
- **适用场景**: 体育赛事解说、竞技类游戏解说、促销广告、短视频中的"咆哮式"旁白。

### 6. 云霞 (女/儿童) —— 可爱童真
- **应用内ID**: `yunxia`
- **显示名称**: 云霞 (男) *注：实际为女性/儿童音*
- **Edge TTS Voice Name**: `zh-CN-YunxiaNeural`
- **API来源**: Microsoft Azure TTS (通过 edge-tts)
- **性别**: 女/儿童（通常被归类为女性/儿童音，非男性）
- **语言**: zh-CN (简体中文)
- **风格**: 稚嫩、纯真、可爱，是典型的儿童声线。
- **适用场景**: 幼儿教育、儿童绘本朗读、动画片低幼角色、萌宠视频配音。

## API 技术细节

### 使用的 TTS 服务
- **服务名称**: Microsoft Azure Text-to-Speech
- **访问方式**: 通过 `edge-tts` Python 库（免费版本）
- **API 类型**: RESTful API（由 edge-tts 封装）

### edge-tts 库
- **GitHub**: https://github.com/rany2/edge-tts
- **说明**: edge-tts 是一个 Python 库，它使用 Microsoft Edge 浏览器的 TTS API，提供免费的文本转语音服务
- **限制**: 免费版本仅支持这 6 个中文大陆发音人

### 代码中的映射位置
- **映射表位置**: `tauri-app/electron/ttsService.cjs` (第 19-26 行)
- **发音人列表**: `tauri-app/electron/ttsService.cjs` (第 1132-1182 行)
- **Python 包装器**: `python/tts_wrapper.py`

### 调用方式
```python
# 通过 edge-tts 库调用
import edge_tts
communicate = edge_tts.Communicate(text, voice_name)
# voice_name 例如: 'zh-CN-YunxiNeural'
```

## 完整映射表（快速参考）

| 应用内ID | 显示名称 | Edge TTS Voice Name | 性别 | 风格定位 |
|---------|---------|---------------------|------|---------|
| zhiwei | 云希 (男) | zh-CN-YunxiNeural | 男 | 活泼灵动 |
| xiaoyu | 晓晓 (女) | zh-CN-XiaoxiaoNeural | 女 | 全能情感 |
| xiaofeng | 云野 (男) | zh-CN-YunyangNeural | 男 | 专业稳重 |
| xiaomei | 晓伊 (女) | zh-CN-XiaoyiNeural | 女 | 温柔甜美 |
| yunjian | 云健 (男) | zh-CN-YunjianNeural | 男 | 激情澎湃 |
| yunxia | 云霞 (女/儿童) | zh-CN-YunxiaNeural | 女/儿童 | 可爱童真 |

## 注意事项

1. **免费限制**: edge-tts 免费版本仅支持这 6 个中文大陆发音人
2. **其他发音人**: 如果需要使用其他发音人（如云枫、云泽、晓辰等），需要使用付费的 Azure TTS API
3. **网络要求**: 使用 edge-tts 需要稳定的网络连接，因为它需要连接到 Microsoft 的服务器
4. **API 稳定性**: edge-tts 使用的是非官方 API，可能会受到 Microsoft 政策变化的影响
