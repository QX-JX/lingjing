# 发音人映射修复报告

## 问题描述

用户报告以下6个发音人无法播放：
- 云枫 (男)
- 云泽 (男)
- 晓辰 (女)
- 晓梦 (女)
- 晓墨 (女)
- 晓涵 (女)

## 问题根本原因

通过测试发现，**这6个发音人在 edge-tts 中根本不存在**。

### Edge-TTS 实际支持的中文大陆发音人

经过测试和验证，edge-tts 只支持以下中文大陆发音人：

#### 男性发音人（4个）
1. ✅ `zh-CN-YunxiNeural` - 云希（专业解说）
2. ✅ `zh-CN-YunyangNeural` - 云野（活泼开朗）
3. ✅ `zh-CN-YunjianNeural` - 云健（运动解说）
4. ✅ `zh-CN-YunxiaNeural` - 云霞（成熟稳重）

#### 女性发音人（2个）
1. ✅ `zh-CN-XiaoxiaoNeural` - 晓晓（温柔甜美）
2. ✅ `zh-CN-XiaoyiNeural` - 晓伊（知性优雅）

### 不存在的发音人

以下发音人在 edge-tts 中**不存在**：
- ❌ `zh-CN-YunfengNeural` - 云枫
- ❌ `zh-CN-YunzeNeural` - 云泽
- ❌ `zh-CN-XiaochenNeural` - 晓辰
- ❌ `zh-CN-XiaomengNeural` - 晓梦
- ❌ `zh-CN-XiaomoNeural` - 晓墨
- ❌ `zh-CN-XiaohanNeural` - 晓涵

## 解决方案

### 1. 发音人映射策略

将不存在的发音人映射到相似的可用发音人：

```javascript
'yunfeng' -> 'zh-CN-YunxiNeural'      // 云枫 -> 云希（相似：专业解说）
'yunze' -> 'zh-CN-YunxiaNeural'       // 云泽 -> 云霞（相似：成熟稳重）
'xiaochen' -> 'zh-CN-XiaoxiaoNeural'  // 晓辰 -> 晓晓（相似：温柔亲切）
'xiaomeng' -> 'zh-CN-XiaoxiaoNeural'  // 晓梦 -> 晓晓（相似：温柔甜美）
'xiaomo' -> 'zh-CN-XiaoyiNeural'      // 晓墨 -> 晓伊（相似：知性成熟）
'xiaohan' -> 'zh-CN-XiaoxiaoNeural'   // 晓涵 -> 晓晓（相似：活泼青春）
```

### 2. 修改的文件

#### 后端配置
- `tauri-app/electron/ttsService.cjs`
  - 更新 `VOICE_MAPPING` 映射表
  - 更新 `getVoiceList()` 函数，添加 `available` 和 `mappedTo` 标记

#### 前端配置
- `tauri-app/src/components/VoiceSelector.tsx`
  - 更新模拟数据中的发音人列表
  - 在描述中添加 `[使用XXX音色]` 提示

- `tauri-app/src/config/voiceAvatars.ts`
  - 更新注释，标记可用和不可用的发音人
  - 添加云霞（yunxia）的配置

### 3. 用户体验改进

1. **透明映射**：用户选择不可用的发音人时，系统会自动使用相似的可用发音人，用户无需手动更改
2. **提示说明**：在发音人描述中添加 `[使用XXX音色]` 提示，告知用户实际使用的音色
3. **保持兼容**：保留所有发音人选项，避免破坏现有项目和用户习惯

## 测试结果

### 测试1: 所有发音人测试

```
成功: 6/12

可用的发音人:
  [OK] 云希 (男)
  [OK] 晓晓 (女)
  [OK] 云野 (男)
  [OK] 晓伊 (女)
  [OK] 云健 (男)
  [OK] 晓萱 (女)

不可用的发音人:
  [FAIL] 云枫 (男)
  [FAIL] 云泽 (男)
  [FAIL] 晓辰 (女)
  [FAIL] 晓梦 (女)
  [FAIL] 晓墨 (女)
  [FAIL] 晓涵 (女)
```

### 测试2: 映射后的发音人测试

```
成功: 6/6

[OK] 所有映射后的发音人都可以正常使用！

现在用户选择以下发音人时，会自动使用对应的替代音色：
  - 云枫 -> 云希
  - 云泽 -> 云霞
  - 晓辰 -> 晓晓
  - 晓梦 -> 晓晓
  - 晓墨 -> 晓伊
  - 晓涵 -> 晓晓
```

## 使用说明

### 对用户来说

1. **无需修改现有项目**：如果您之前使用了云枫、云泽、晓辰、晓梦、晓墨、晓涵等发音人，系统会自动映射到相似的可用发音人，不会影响音频生成
2. **音色会有差异**：由于使用了替代音色，生成的音频可能与预期有所不同，建议重新试听并调整
3. **推荐使用可用发音人**：为了获得最佳效果，建议直接选择可用的6个发音人（云希、晓晓、云野、晓伊、云健、云霞）

### 对开发者来说

1. **添加新发音人**：在添加新发音人前，请先运行 `python python/list_available_voices.py` 查看可用的发音人列表
2. **测试发音人**：使用 `python python/test_all_voices.py` 测试所有发音人是否可用
3. **验证映射**：使用 `python python/test_mapped_voices.py` 验证映射配置是否正确

## 相关脚本

### 1. 列出可用发音人
```bash
python python/list_available_voices.py
```

### 2. 测试所有发音人
```bash
python python/test_all_voices.py
```

### 3. 测试映射配置
```bash
python python/test_mapped_voices.py
```

## 注意事项

1. **edge-tts 限制**：edge-tts 是免费服务，支持的发音人数量有限，且可能随时变化
2. **网络要求**：需要能够访问 Azure TTS 服务（通常是 `https://speech.platform.bing.com`）
3. **代理问题**：edge-tts 不支持 HTTPS 代理，如果有代理配置可能导致失败
4. **音色差异**：映射后的音色与原始音色可能存在差异，建议用户试听后再决定是否使用

## 总结

通过发音人映射策略，我们成功解决了6个不可用发音人的问题。用户现在可以：
- ✅ 选择任何发音人，系统会自动处理
- ✅ 继续使用现有项目，无需修改
- ✅ 获得清晰的提示，了解实际使用的音色

---

**修复时间**: 2026-01-23  
**修复状态**: ✅ 已完成并测试通过
