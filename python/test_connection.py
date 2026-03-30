"""
Edge TTS 网络连接诊断工具
用于测试是否能正常连接到 Azure Edge TTS 服务
"""
import asyncio
import sys
import os

# 禁用所有代理
proxy_vars = ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 
              'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']
for var in proxy_vars:
    if var in os.environ:
        del os.environ[var]

os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

async def test_connection():
    """测试 edge-tts 连接"""
    print("=" * 60)
    print("Edge TTS 连接诊断工具")
    print("=" * 60)
    
    # 1. 检查 edge-tts 是否已安装
    print("\n[1/4] 检查 edge-tts 模块...")
    try:
        import edge_tts
        print(f"[OK] edge-tts 已安装，版本: {edge_tts.__version__ if hasattr(edge_tts, '__version__') else '未知'}")
    except ImportError as e:
        print(f"[ERROR] edge-tts 未安装: {e}")
        print("\n请运行以下命令安装：")
        print("  pip install edge-tts")
        return False
    
    # 2. 测试网络连接
    print("\n[2/4] 测试网络连接...")
    try:
        import aiohttp
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # 测试连接到 Azure TTS 服务
            url = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list"
            async with session.get(url, params={"trustedclienttoken": "6A5AA1D4EAFF4E9FB37E23D68491D6F4"}) as response:
                if response.status == 200:
                    print("[OK] 网络连接正常，可以访问 Azure TTS 服务")
                else:
                    print(f"[ERROR] 服务返回异常状态码: {response.status}")
                    return False
    except asyncio.TimeoutError:
        print("[ERROR] 连接超时，请检查：")
        print("  1. 网络连接是否正常")
        print("  2. 防火墙是否阻止了连接")
        print("  3. 是否需要使用代理（注意：edge-tts 不支持 HTTPS 代理）")
        return False
    except Exception as e:
        print(f"[ERROR] 网络连接失败: {e}")
        return False
    
    # 3. 测试获取发音人列表
    print("\n[3/4] 测试获取发音人列表...")
    try:
        voices = await edge_tts.list_voices()
        zh_voices = [v for v in voices if v.get("Locale", "").startswith("zh-CN")]
        print(f"[OK] 成功获取发音人列表，共 {len(voices)} 个发音人（其中中文 {len(zh_voices)} 个）")
    except Exception as e:
        print(f"[ERROR] 获取发音人列表失败: {e}")
        return False
    
    # 4. 测试生成简短音频
    print("\n[4/4] 测试生成音频...")
    try:
        test_text = "这是一个测试。"
        test_voice = "zh-CN-XiaoxiaoNeural"
        test_file = "test_audio.mp3"
        
        communicate = edge_tts.Communicate(test_text, test_voice)
        
        # 设置 10 秒超时
        await asyncio.wait_for(communicate.save(test_file), timeout=10.0)
        
        # 检查文件是否生成
        if os.path.exists(test_file):
            file_size = os.path.getsize(test_file)
            if file_size > 0:
                print(f"[OK] 音频生成成功！文件大小: {file_size} 字节")
                print(f"  测试文件已保存到: {os.path.abspath(test_file)}")
                # 清理测试文件
                try:
                    os.remove(test_file)
                    print("  (测试文件已自动删除)")
                except:
                    pass
                return True
            else:
                print("[ERROR] 生成的音频文件为空")
                return False
        else:
            print("[ERROR] 音频文件未生成")
            return False
            
    except asyncio.TimeoutError:
        print("[ERROR] 音频生成超时")
        return False
    except Exception as e:
        print(f"[ERROR] 音频生成失败: {type(e).__name__}: {e}")
        
        # 特殊处理 NoAudioReceived 错误
        if "NoAudioReceived" in str(e):
            print("\n这是一个常见的网络问题，可能的原因：")
            print("  1. 网络连接不稳定或速度过慢")
            print("  2. 防火墙或安全软件阻止了连接")
            print("  3. Azure TTS 服务暂时不可用")
            print("  4. 本地时间与服务器时间差异过大")
            print("\n建议尝试：")
            print("  - 检查网络连接，尝试访问其他网站")
            print("  - 暂时关闭防火墙或杀毒软件")
            print("  - 检查系统时间是否正确")
            print("  - 稍后重试")
        
        return False

async def main():
    try:
        success = await test_connection()
        
        print("\n" + "=" * 60)
        if success:
            print("[SUCCESS] 所有测试通过！Edge TTS 工作正常。")
            print("=" * 60)
            sys.exit(0)
        else:
            print("[FAILED] 测试失败，请根据上述提示解决问题。")
            print("=" * 60)
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n测试已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
