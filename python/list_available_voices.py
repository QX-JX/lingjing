"""
列出所有可用的中文发音人
"""
import asyncio
import edge_tts
import sys

async def main():
    """列出所有可用的中文发音人"""
    print("\n正在获取所有可用的中文发音人...")
    print("="*80)
    
    try:
        # 获取所有发音人列表
        voices = await edge_tts.list_voices()
        
        # 筛选中文发音人
        zh_voices = [v for v in voices if v["Locale"].startswith("zh-")]
        
        print(f"\n找到 {len(zh_voices)} 个中文发音人:\n")
        
        # 按性别分组
        male_voices = []
        female_voices = []
        
        for voice in sorted(zh_voices, key=lambda x: x["ShortName"]):
            name = voice["ShortName"]
            locale = voice["Locale"]
            gender = voice["Gender"]
            display_name = voice.get("FriendlyName", name)
            
            voice_info = f"{name:40s} | {locale:10s} | {gender:10s} | {display_name}"
            
            if gender == "Male":
                male_voices.append(voice_info)
            else:
                female_voices.append(voice_info)
        
        print("男性发音人:")
        print("-" * 80)
        for info in male_voices:
            print(info)
        
        print("\n女性发音人:")
        print("-" * 80)
        for info in female_voices:
            print(info)
        
        print("\n" + "="*80)
        print(f"总计: {len(male_voices)} 个男性, {len(female_voices)} 个女性")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # 在 Windows 上使用 SelectorEventLoop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
