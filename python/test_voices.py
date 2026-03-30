"""
测试所有发音人的可用性
"""
import asyncio
import edge_tts
import os
import sys

# 禁用代理
proxy_vars = ['HTTPS_PROXY', 'HTTP_PROXY', 'https_proxy', 'http_proxy', 
              'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']
for var in proxy_vars:
    if var in os.environ:
        del os.environ[var]

os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'

# 测试的发音人列表
VOICES_TO_TEST = [
    ('zh-CN-YunfengNeural', '云枫 (男)'),
    ('zh-CN-YunzeNeural', '云泽 (男)'),
    ('zh-CN-XiaochenNeural', '晓辰 (女)'),
    ('zh-CN-XiaomengNeural', '晓梦 (女)'),
    ('zh-CN-XiaomoNeural', '晓墨 (女)'),
    ('zh-CN-XiaohanNeural', '晓涵 (女)'),
]

async def test_voice(voice_id, voice_name):
    """测试单个发音人"""
    try:
        print(f"\n{'='*60}")
        print(f"测试发音人: {voice_name} ({voice_id})")
        print(f"{'='*60}")
        
        # 测试文本
        test_text = "你好，这是一段测试语音。"
        
        # 创建临时输出文件
        output_file = f"test_{voice_id.replace('-', '_')}.mp3"
        
        # 尝试生成音频
        print(f"正在生成音频...")
        communicate = edge_tts.Communicate(test_text, voice_id)
        
        # 设置5秒超时
        await asyncio.wait_for(communicate.save(output_file), timeout=10.0)
        
        # 检查文件是否生成
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            print(f"[OK] 成功! 文件大小: {file_size} 字节")
            # 删除测试文件
            os.remove(output_file)
            return True
        else:
            print(f"[FAIL] 失败: 文件未生成")
            return False
            
    except asyncio.TimeoutError:
        print(f"[FAIL] 失败: 超时（10秒内未完成）")
        return False
    except Exception as e:
        print(f"[FAIL] 失败: {type(e).__name__}: {str(e)}")
        return False

async def main():
    """主函数"""
    print("\n" + "="*60)
    print("开始测试发音人可用性")
    print("="*60)
    
    # 先测试网络连接
    print("\n1. 测试网络连接...")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get('https://www.bing.com', timeout=aiohttp.ClientTimeout(total=5)) as response:
                if response.status == 200:
                    print("[OK] 网络连接正常")
                else:
                    print(f"[WARN] 网络连接异常: HTTP {response.status}")
    except Exception as e:
        print(f"[FAIL] 网络连接失败: {e}")
        print("\n建议:")
        print("1. 检查网络连接是否正常")
        print("2. 检查防火墙是否阻止了连接")
        print("3. 尝试禁用 VPN 或代理")
        return
    
    # 测试每个发音人
    print("\n2. 测试发音人...")
    results = []
    
    for voice_id, voice_name in VOICES_TO_TEST:
        success = await test_voice(voice_id, voice_name)
        results.append((voice_name, success))
        # 每次测试之间等待1秒
        await asyncio.sleep(1)
    
    # 打印总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    
    success_count = sum(1 for _, success in results if success)
    total_count = len(results)
    
    for voice_name, success in results:
        status = "[OK] 可用" if success else "[FAIL] 不可用"
        print(f"{voice_name}: {status}")
    
    print(f"\n成功: {success_count}/{total_count}")
    
    if success_count == 0:
        print("\n[WARN] 所有发音人都不可用！")
        print("\n可能的原因:")
        print("1. 网络连接不稳定或被限制")
        print("2. Azure TTS 服务暂时不可用")
        print("3. 系统时间与服务器时间差异过大")
        print("4. edge-tts 库版本过旧")
        print("\n建议:")
        print("1. 检查系统时间是否正确")
        print("2. 尝试更新 edge-tts: pip install --upgrade edge-tts")
        print("3. 稍后重试")
        print("4. 检查是否有防火墙或安全软件阻止连接")
    elif success_count < total_count:
        print("\n[WARN] 部分发音人不可用")
        print("这可能是临时的网络问题，请稍后重试。")
    else:
        print("\n[OK] 所有发音人都可用！")

if __name__ == "__main__":
    # 在 Windows 上使用 SelectorEventLoop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
