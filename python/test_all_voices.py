"""
测试所有发音人（包括基础的4个）
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

# 测试所有发音人
ALL_VOICES = [
    # 基础4个
    ('zh-CN-YunxiNeural', '云希 (男)'),
    ('zh-CN-XiaoxiaoNeural', '晓晓 (女)'),
    ('zh-CN-YunyangNeural', '云野 (男)'),
    ('zh-CN-XiaoyiNeural', '晓伊 (女)'),
    
    # 用户报告无法播放的6个
    ('zh-CN-YunfengNeural', '云枫 (男)'),
    ('zh-CN-YunzeNeural', '云泽 (男)'),
    ('zh-CN-XiaochenNeural', '晓辰 (女)'),
    ('zh-CN-XiaomengNeural', '晓梦 (女)'),
    ('zh-CN-XiaomoNeural', '晓墨 (女)'),
    ('zh-CN-XiaohanNeural', '晓涵 (女)'),
    
    # 其他2个
    ('zh-CN-YunjianNeural', '云健 (男)'),
    ('zh-CN-XiaoxuanNeural', '晓萱 (女)'),
]

async def test_voice(voice_id, voice_name):
    """测试单个发音人"""
    try:
        # 测试文本
        test_text = "你好"
        
        # 创建临时输出文件
        output_file = f"test_{voice_id.replace('-', '_')}.mp3"
        
        # 尝试生成音频
        communicate = edge_tts.Communicate(test_text, voice_id)
        
        # 设置5秒超时
        await asyncio.wait_for(communicate.save(output_file), timeout=5.0)
        
        # 检查文件是否生成
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            # 删除测试文件
            os.remove(output_file)
            return True, file_size
        else:
            return False, 0
            
    except asyncio.TimeoutError:
        return False, 0
    except Exception as e:
        return False, 0

async def main():
    """主函数"""
    print("\n" + "="*60)
    print("测试所有发音人")
    print("="*60)
    
    results = []
    
    for voice_id, voice_name in ALL_VOICES:
        print(f"测试 {voice_name}...", end=" ", flush=True)
        success, file_size = await test_voice(voice_id, voice_name)
        results.append((voice_name, success, file_size))
        
        if success:
            print(f"[OK] ({file_size} bytes)")
        else:
            print(f"[FAIL]")
        
        # 每次测试之间等待0.5秒
        await asyncio.sleep(0.5)
    
    # 打印总结
    print("\n" + "="*60)
    print("测试总结")
    print("="*60)
    
    success_count = sum(1 for _, success, _ in results if success)
    total_count = len(results)
    
    print(f"\n成功: {success_count}/{total_count}\n")
    
    # 分类显示
    print("可用的发音人:")
    available = [name for name, success, _ in results if success]
    if available:
        for name in available:
            print(f"  [OK] {name}")
    else:
        print("  (无)")
    
    print("\n不可用的发音人:")
    unavailable = [name for name, success, _ in results if not success]
    if unavailable:
        for name in unavailable:
            print(f"  [FAIL] {name}")
    else:
        print("  (无)")

if __name__ == "__main__":
    # 在 Windows 上使用 SelectorEventLoop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
