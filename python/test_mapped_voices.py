"""
测试映射后的发音人是否可用
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

# 映射后的发音人配置
VOICE_MAPPING = {
    'yunfeng': 'zh-CN-YunxiNeural',         # 云枫 -> 云希
    'yunze': 'zh-CN-YunxiaNeural',          # 云泽 -> 云霞
    'xiaochen': 'zh-CN-XiaoxiaoNeural',     # 晓辰 -> 晓晓
    'xiaomeng': 'zh-CN-XiaoxiaoNeural',     # 晓梦 -> 晓晓
    'xiaomo': 'zh-CN-XiaoyiNeural',         # 晓墨 -> 晓伊
    'xiaohan': 'zh-CN-XiaoxiaoNeural',      # 晓涵 -> 晓晓
}

async def test_voice(user_id, mapped_id):
    """测试映射后的发音人"""
    try:
        test_text = "你好"
        output_file = f"test_{user_id}.mp3"
        
        communicate = edge_tts.Communicate(test_text, mapped_id)
        await asyncio.wait_for(communicate.save(output_file), timeout=5.0)
        
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            os.remove(output_file)
            return True, file_size
        else:
            return False, 0
            
    except Exception as e:
        return False, 0

async def main():
    """主函数"""
    print("\n" + "="*70)
    print("测试映射后的发音人")
    print("="*70)
    
    results = []
    
    for user_id, mapped_id in VOICE_MAPPING.items():
        print(f"测试 {user_id} -> {mapped_id}...", end=" ", flush=True)
        success, file_size = await test_voice(user_id, mapped_id)
        results.append((user_id, mapped_id, success, file_size))
        
        if success:
            print(f"[OK] ({file_size} bytes)")
        else:
            print(f"[FAIL]")
        
        await asyncio.sleep(0.5)
    
    # 打印总结
    print("\n" + "="*70)
    print("测试总结")
    print("="*70)
    
    success_count = sum(1 for _, _, success, _ in results if success)
    total_count = len(results)
    
    print(f"\n成功: {success_count}/{total_count}\n")
    
    if success_count == total_count:
        print("[OK] 所有映射后的发音人都可以正常使用！")
        print("\n现在用户选择以下发音人时，会自动使用对应的替代音色：")
        print("  - 云枫 -> 云希")
        print("  - 云泽 -> 云霞")
        print("  - 晓辰 -> 晓晓")
        print("  - 晓梦 -> 晓晓")
        print("  - 晓墨 -> 晓伊")
        print("  - 晓涵 -> 晓晓")
    else:
        print("[WARN] 部分映射失败，请检查配置")
        for user_id, mapped_id, success, _ in results:
            if not success:
                print(f"  [FAIL] {user_id} -> {mapped_id}")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
