import asyncio
import edge_tts
import argparse
import sys
import os
import re
import warnings
import time

# 禁用所有代理（edge-tts 不支持 HTTPS 代理，且代理可能导致连接失败）
# 清除所有代理相关的环境变量，确保 edge-tts 正常工作
proxy_vars = ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 
              'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']
for var in proxy_vars:
    if var in os.environ:
        del os.environ[var]

# 设置环境变量强制禁用代理（针对 edge-tts 内部可能使用的代理检测）
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

# 忽略代理相关的警告
warnings.filterwarnings('ignore', category=UserWarning, message='.*proxy.*')

# 重试配置
MAX_RETRIES = 3  # 最大重试次数
RETRY_DELAY = 2  # 重试延迟（秒）

async def generate_audio_with_retry(text, voice, rate, volume, pitch, output_file, max_retries=MAX_RETRIES):
    """
    生成音频并保存到文件（带重试机制）
    Rate format: +50% or -10%
    Volume format: +50% or -10%
    Pitch format: +50Hz or -10Hz
    """
    last_error = None
    
    # 记录接收到的文本信息（用于调试特效音插入位置问题）
    clean_text_for_log = re.sub(r'<[^>]+>', '', text)
    sound_effects = re.findall(r'<sound\s+effect=["\']([^"\']+)["\']\s*/>', text)
    print(f"[TTS_WRAPPER] 接收文本信息:", file=sys.stderr)
    print(f"  - 原始文本长度: {len(text)}", file=sys.stderr)
    print(f"  - 纯文本长度: {len(clean_text_for_log)}", file=sys.stderr)
    print(f"  - 特效音数量: {len(sound_effects)}", file=sys.stderr)
    if sound_effects:
        print(f"  - 特效音列表: {sound_effects}", file=sys.stderr)
        # 查找每个特效音在文本中的位置
        for i, effect_id in enumerate(sound_effects):
            pattern = f'<sound\\s+effect=["\']{re.escape(effect_id)}["\']\\s*/>'
            matches = list(re.finditer(pattern, text))
            for j, match in enumerate(matches):
                pos = match.start()
                # 计算在纯文本中的大致位置（简单估算）
                text_before = text[:pos]
                clean_before = re.sub(r'<[^>]+>', '', text_before)
                print(f"  - 特效音[{i}][{j}] '{effect_id}' 位置: 原始文本 {pos}, 纯文本约 {len(clean_before)}", file=sys.stderr)
    print(f"  - 文本预览（前100字符）: {text[:100]}", file=sys.stderr)
    
    # 检测是否是极短文本（用于后续的错误处理优化）
    clean_text_for_check = re.sub(r'<[^>]+>', '', text)
    is_short_text = len(clean_text_for_check.strip()) < 15
    
    for attempt in range(max_retries):
        try:
            # 验证文本长度（去除标签后的纯文本）
            clean_text = re.sub(r'<[^>]+>', '', text)
            text_length = len(clean_text)
            
            if text_length == 0:
                raise ValueError("文本内容为空")
            
            if text_length > 5000:
                print(f"WARNING: 文本长度 ({text_length} 字符) 超过推荐值，可能导致处理失败", file=sys.stderr)
            
            # 检测文本是否是 SSML 格式（包含 <speak> 标签）
            is_ssml = text.strip().startswith('<speak>') or text.strip().startswith('<speak ')
            
            if attempt > 0:
                print(f"重试第 {attempt}/{max_retries - 1} 次...", file=sys.stderr)
            
            # 对于短文本的重试，逐步降低语速以增加稳定性
            current_rate = rate
            if is_short_text and attempt > 0:
                # 短文本重试时降低语速：第一次重试 -10%，第二次重试 -20%
                slow_down = -10 * attempt
                current_rate = f"{slow_down}%"
                print(f"INFO: 短文本重试，降低语速到 {current_rate}", file=sys.stderr)
            
            if is_ssml:
                # 如果是 SSML，不传递 rate/volume/pitch 参数
                communicate = edge_tts.Communicate(text, voice)
            else:
                # 如果是纯文本，使用传入的参数
                communicate = edge_tts.Communicate(text, voice, rate=current_rate, volume=volume, pitch=pitch)
            
            # 生成音频，设置超时（10分钟）
            try:
                await asyncio.wait_for(communicate.save(output_file), timeout=600.0)
            except asyncio.TimeoutError:
                raise TimeoutError(f"音频生成超时（超过10分钟），文本长度: {text_length} 字符")
            
            # 验证输出文件是否存在且不为空
            if not os.path.exists(output_file):
                raise FileNotFoundError(f"音频文件未生成: {output_file}")
            
            file_size = os.path.getsize(output_file)
            if file_size == 0:
                raise ValueError(f"生成的音频文件为空: {output_file}")
            
            # 成功时打印输出路径，供调用方解析
            print(f"SUCCESS:{output_file}")
            return
            
        except Exception as e:
            last_error = e
            error_type = type(e).__name__
            error_msg = str(e)
            
            # 检查是否是网络相关的错误
            is_network_error = (
                "NoAudioReceived" in error_msg or
                "timeout" in error_msg.lower() or
                "connection" in error_msg.lower() or
                "network" in error_msg.lower()
            )
            
            # 如果是最后一次尝试，或者不是网络错误，直接抛出
            if attempt == max_retries - 1 or not is_network_error:
                # 提供更友好的错误信息
                if "NoAudioReceived" in error_msg:
                    print(f"ERROR:{error_type}: {error_msg}", file=sys.stderr)
                    print("", file=sys.stderr)
                    print("这通常是网络连接问题，可能的原因：", file=sys.stderr)
                    print("1. 网络连接不稳定或速度过慢", file=sys.stderr)
                    print("2. 防火墙或安全软件阻止了连接", file=sys.stderr)
                    print("3. Azure TTS 服务暂时不可用", file=sys.stderr)
                    print("4. 本地时间与服务器时间差异过大", file=sys.stderr)
                    print("", file=sys.stderr)
                    print("建议：", file=sys.stderr)
                    print("- 检查网络连接是否正常", file=sys.stderr)
                    print("- 运行 'python python/test_connection.py' 进行诊断", file=sys.stderr)
                    print("- 稍后重试", file=sys.stderr)
                else:
                    print(f"ERROR:{error_type}: {error_msg}", file=sys.stderr)
                sys.exit(1)
            
            # 等待后重试
            print(f"遇到网络错误: {error_type}，{RETRY_DELAY}秒后重试...", file=sys.stderr)
            await asyncio.sleep(RETRY_DELAY)

async def generate_audio(text, voice, rate, volume, pitch, output_file):
    """
    生成音频并保存到文件
    """
    await generate_audio_with_retry(text, voice, rate, volume, pitch, output_file)

def main():
    parser = argparse.ArgumentParser(description='Edge TTS Wrapper')
    parser.add_argument('--text', required=True, help='Text to synthesize')
    parser.add_argument('--voice', required=True, help='Voice ID (e.g., zh-CN-XiaoxiaoNeural)')
    parser.add_argument('--rate', default='+0%', help='Rate (e.g., +0%)')
    parser.add_argument('--volume', default='+0%', help='Volume (e.g., +0%)')
    parser.add_argument('--pitch', default='+0Hz', help='Pitch (e.g., +0Hz)')
    parser.add_argument('--output', required=True, help='Output file path')
    parser.add_argument('--max-retries', type=int, default=MAX_RETRIES, help='Maximum number of retries')

    args = parser.parse_args()

    # 确保输出目录存在
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 使用更安全的事件循环处理方式，避免 Windows 上的事件循环关闭错误
    try:
        # 在 Windows 上，使用 SelectorEventLoop 而不是默认的 ProactorEventLoop
        # 这样可以避免事件循环关闭时的错误
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        # 运行异步函数
        asyncio.run(generate_audio_with_retry(
            args.text,
            args.voice,
            args.rate,
            args.volume,
            args.pitch,
            args.output,
            args.max_retries
        ))
    except RuntimeError as e:
        # 如果事件循环已经关闭，忽略该错误（这通常发生在进程退出时）
        if 'Event loop is closed' not in str(e):
            raise
        # 如果是事件循环关闭错误，直接退出（此时任务应该已经完成）
        pass
    except Exception as e:
        print(f"ERROR:{str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
