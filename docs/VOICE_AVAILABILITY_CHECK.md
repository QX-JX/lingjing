# 发音人可用性检查报告

## 检查结果

根据 edge-tts 免费版本的检查，图片中列出的13个发音人情况如下：

### ✅ 已支持（6个）- 免费可用

这些发音人已经在 edge-tts 免费版本中支持，并且已经添加到应用中：

1. **zh-CN-XiaoxiaoNeural** - 晓晓 (女) ✅
2. **zh-CN-YunxiNeural** - 云希 (男) ✅
3. **zh-CN-YunyangNeural** - 云扬 (男) ✅ (代码中显示为"云野")
4. **zh-CN-XiaoyiNeural** - 晓伊 (女) ✅
5. **zh-CN-YunjianNeural** - 云健 (男) ✅
6. **zh-CN-YunxiaNeural** - 云霞 (女) ✅

### ❌ 不支持（7个）- 需要付费 Azure TTS API

这些发音人在 edge-tts 免费版本中**不存在**，需要使用付费的 Azure TTS API：

1. **zh-CN-XiaonuoNeural** - 晓诺 (女) ❌
   - 描述：专业播报 (严肃、正式)
   - 状态：需要 Azure TTS API

2. **zh-CN-XiaomengNeural** - 晓梦 (女) ❌
   - 描述：柔美感性 (情感电台)
   - 状态：需要 Azure TTS API

3. **zh-CN-XiaozeNeural** - 晓泽 (男) ❌
   - 描述：睿智成熟 (适合解说、百科)
   - 状态：需要 Azure TTS API

4. **zh-CN-XiaorenyuanNeural** - 晓甄 (女) ❌
   - 描述：自然生活 (邻家感)
   - 状态：需要 Azure TTS API

5. **zh-CN-XiaochenNeural** - 晓辰 (女) ❌
   - 描述：现代干练
   - 状态：需要 Azure TTS API
   - 注意：edge-tts 有 `zh-TW-HsiaoChenNeural`（台湾版），但不是大陆版

6. **zh-CN-XiaohanNeural** - 晓涵 (女) ❌
   - 描述：温柔稳重
   - 状态：需要 Azure TTS API

7. **zh-CN-XiaoxuanNeural** - 晓萱 (女) ❌
   - 描述：活泼亲和
   - 状态：需要 Azure TTS API

## 总结

- **免费可用**: 6个发音人（已全部添加到应用中）
- **需要付费**: 7个发音人（需要 Azure TTS API 密钥）

## 建议

如果您需要使用这7个付费发音人，需要：
1. 注册 Azure 账号
2. 创建 Speech Service 资源
3. 获取 API 密钥和区域
4. 修改代码以支持 Azure TTS API（而不是 edge-tts）

目前应用已经包含了所有 edge-tts 免费支持的发音人。
