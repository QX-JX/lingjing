# 故障排查指南

## 音频生成失败：NoAudioReceived 错误

如果你遇到 `NoAudioReceived: No audio was received` 错误，这通常是**网络连接问题**导致的。

### 问题原因

这个错误表示应用无法连接到 Azure Edge TTS 服务。可能的原因包括：

1. **网络连接不稳定或速度过慢**
2. **防火墙或安全软件阻止了连接**
3. **Azure TTS 服务暂时不可用**
4. **本地时间与服务器时间差异过大**
5. **网络代理配置问题**

### 解决方案

#### 1. 运行诊断工具

我们提供了一个诊断工具，可以帮助你快速定位问题：

```bash
# 在项目根目录运行
python python/test_connection.py
```

这个工具会：
- 检查 edge-tts 是否正确安装
- 测试网络连接到 Azure TTS 服务
- 尝试获取发音人列表
- 生成一个测试音频

如果所有测试通过，说明网络连接正常，问题可能是临时的。

#### 2. 检查网络连接

确保你的电脑可以正常访问互联网：

```bash
# Windows
ping www.bing.com

# 或访问浏览器测试
# https://www.bing.com
```

#### 3. 检查防火墙设置

**Windows 防火墙：**
1. 打开"Windows 安全中心"
2. 点击"防火墙和网络保护"
3. 点击"允许应用通过防火墙"
4. 找到 Python 或你的应用，确保已勾选"专用"和"公用"

**第三方杀毒软件：**
- 暂时关闭杀毒软件，测试是否能正常生成音频
- 如果关闭后可以正常使用，请在杀毒软件中添加白名单

#### 4. 检查系统时间

确保你的系统时间是正确的：

1. 右键点击任务栏时间
2. 选择"调整日期/时间"
3. 开启"自动设置时间"
4. 确保时区正确

#### 5. 检查代理设置

如果你使用了网络代理，请注意：

⚠️ **Edge TTS 不支持 HTTPS 代理！**

建议：
- 暂时禁用代理
- 或使用直连网络

**检查和清除代理：**

```bash
# Windows PowerShell
# 查看代理设置
Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'

# 清除代理（临时）
[System.Net.WebRequest]::DefaultWebProxy = $null
```

#### 6. 更新 edge-tts

确保使用最新版本的 edge-tts：

```bash
pip install --upgrade edge-tts
```

#### 7. 重试机制

应用已经内置了自动重试机制（最多重试 3 次），如果仍然失败：

- 等待几分钟后重试
- 尝试缩短文本长度（每次不超过 1000 字）
- 分段生成音频

### 常见错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `NoAudioReceived` | 网络连接失败 | 按照上述步骤检查网络 |
| `Timeout` | 生成超时 | 缩短文本或检查网络速度 |
| `Connection refused` | 防火墙阻止 | 检查防火墙设置 |
| `Connection timeout` | 网络不稳定 | 检查网络连接 |

### 技术支持

如果以上方法都无法解决问题，请提供以下信息：

1. 运行诊断工具的输出结果
2. 错误日志（在终端中查看）
3. 你的网络环境（是否使用代理、防火墙等）
4. 操作系统版本

## 其他常见问题

### 音频质量问题

如果生成的音频质量不佳：
- 检查网络速度是否稳定
- 尝试使用不同的发音人
- 确保文本格式正确（无乱码）

### 应用启动失败

如果应用无法启动：

```bash
# 检查依赖是否完整
npm install
pip install -r requirements.txt

# 重新启动应用
npm run electron:dev
```

### Python 环境问题

如果提示找不到 Python 或模块：

```bash
# 确认 Python 版本（需要 3.8+）
python --version

# 安装依赖
pip install edge-tts

# 或使用虚拟环境
python -m venv venv
venv\Scripts\activate  # Windows
pip install edge-tts
```

## 性能优化建议

1. **文本长度控制**：每次生成不超过 1000-2000 字
2. **网络稳定性**：使用有线网络或稳定的 WiFi
3. **避免高峰期**：避开网络高峰期使用
4. **分段处理**：对于长文本，建议分段生成后合并

## 反馈与改进

如果你遇到了新的问题或有改进建议，欢迎反馈！
