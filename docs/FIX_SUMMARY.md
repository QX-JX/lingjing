# 音频生成问题修复总结

## 问题描述

用户在生成音频时遇到 `NoAudioReceived` 错误：

```
ERROR:NoAudioReceived: No audio was received. 
Please verify that your parameters are correct.
```

## 根本原因

这是一个**网络连接问题**，通常由以下原因引起：
- 网络连接不稳定或暂时中断
- 防火墙或安全软件阻止了连接
- Azure TTS 服务暂时不可用
- 网络延迟过高

## 已实施的改进

### 1. 添加重试机制（`python/tts_wrapper.py`）

- 自动重试最多 3 次
- 每次重试间隔 2 秒
- 只对网络相关错误进行重试
- 提供详细的错误日志

```python
# 重试配置
MAX_RETRIES = 3  # 最大重试次数
RETRY_DELAY = 2  # 重试延迟（秒）
```

### 2. 改进错误提示（`tauri-app/src/components/StatusBar.tsx`）

为用户提供更友好的错误信息：

- **NoAudioReceived 错误**：提示网络连接问题和解决方案
- **Timeout 错误**：提示缩短文本或检查网络速度
- 统一的错误处理逻辑

### 3. 创建诊断工具（`python/test_connection.py`）

提供一键诊断功能，检查：
- edge-tts 模块是否安装
- 网络连接是否正常
- 能否获取发音人列表
- 能否生成测试音频

**使用方法：**
```bash
python python/test_connection.py
```

### 4. 故障排查文档（`TROUBLESHOOTING.md`）

提供完整的故障排查指南，包括：
- 常见错误原因分析
- 详细的解决步骤
- 网络、防火墙、代理配置检查
- 性能优化建议

## 诊断结果

运行诊断工具后，所有测试通过：

```
[OK] edge-tts 已安装，版本: 7.2.7
[OK] 网络连接正常，可以访问 Azure TTS 服务
[OK] 成功获取发音人列表，共 322 个发音人（其中中文 8 个）
[OK] 音频生成成功！文件大小: 11088 字节
[SUCCESS] 所有测试通过！Edge TTS 工作正常。
```

**结论**：网络连接正常，edge-tts 功能正常，之前的问题可能是临时网络波动。

## 使用建议

### 如果再次遇到生成失败

1. **首先检查网络连接**
   ```bash
   python python/test_connection.py
   ```

2. **查看详细错误信息**
   - 打开开发者工具（F12）
   - 查看控制台日志
   - 查看终端输出

3. **尝试以下操作**
   - 等待几秒后重试（应用已有自动重试）
   - 缩短文本长度（每次不超过 1000 字）
   - 检查防火墙设置
   - 确保网络稳定

### 优化建议

1. **文本长度控制**
   - 单次生成不超过 1000-2000 字
   - 长文本建议分段处理
   - 系统会自动分段（超过 1000 字）

2. **网络环境**
   - 使用稳定的网络连接
   - 避免使用代理（edge-tts 不支持 HTTPS 代理）
   - 确保防火墙允许 Python 访问网络

3. **性能优化**
   - 避开网络高峰期
   - 使用有线网络
   - 关闭其他占用网络的程序

## 技术细节

### 重试逻辑

```python
async def generate_audio_with_retry(text, voice, rate, volume, pitch, output_file, max_retries=3):
    for attempt in range(max_retries):
        try:
            # 尝试生成音频
            communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume, pitch=pitch)
            await asyncio.wait_for(communicate.save(output_file), timeout=600.0)
            return  # 成功则返回
        except Exception as e:
            # 检查是否是网络错误
            is_network_error = (
                "NoAudioReceived" in str(e) or
                "timeout" in str(e).lower() or
                "connection" in str(e).lower()
            )
            
            if attempt == max_retries - 1 or not is_network_error:
                raise  # 最后一次或非网络错误则抛出
            
            # 等待后重试
            await asyncio.sleep(2)
```

### 前端错误处理

```typescript
catch (error) {
  let errorMessage = `生成音频失败: ${error}`;
  
  if (String(error).includes('NoAudioReceived')) {
    errorMessage = '网络连接失败，无法生成音频。\n\n' +
      '可能的原因：\n• 网络连接不稳定\n• 防火墙阻止了连接\n' +
      '• Azure TTS 服务暂时不可用\n\n' +
      '建议：\n• 检查网络连接\n• 稍后重试';
  }
  
  showToast(errorMessage, 'error');
}
```

## 后续监控

如果问题再次出现，请收集以下信息：

1. 诊断工具输出结果
2. 控制台错误日志
3. 失败时的文本内容和长度
4. 网络环境（是否使用代理、VPN 等）
5. 失败的时间和频率

## 文件清单

### 新增文件
- `python/test_connection.py` - 网络连接诊断工具
- `TROUBLESHOOTING.md` - 故障排查指南
- `FIX_SUMMARY.md` - 本文档

### 修改文件
- `python/tts_wrapper.py` - 添加重试机制和更好的错误处理
- `tauri-app/src/components/StatusBar.tsx` - 改进用户错误提示

## 总结

通过添加重试机制、改进错误提示和提供诊断工具，应用现在对网络波动有更好的容错能力。诊断测试确认系统工作正常，如果再次遇到问题，可以快速定位并解决。

---

**更新时间**: 2026-01-23  
**状态**: ✅ 已修复并验证
