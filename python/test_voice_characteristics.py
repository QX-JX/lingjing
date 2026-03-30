"""
测试每个发音人的实际音色特点
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

# 测试文本 - 使用相同的文本以便比较
TEST_TEXTS = {
    'formal': '尊敬的各位来宾，大家好。今天我们将为大家介绍一项重要的内容。',
    'casual': '嗨，大家好！今天天气真不错，我们来聊点有趣的话题吧。',
    'emotional': '在这个温暖的午后，我想和你分享一个关于梦想的故事。',
    'business': '根据市场分析，我们建议采取以下策略来提升业务表现。',
    'children': '小朋友们，今天我们要讲一个非常有趣的故事，准备好了吗？',
    'sports': '比赛进行到关键时刻，选手们全力以赴，现场气氛非常热烈！'
}

VOICES = [
    ('zh-CN-YunxiNeural', '云希'),
    ('zh-CN-XiaoxiaoNeural', '晓晓'),
    ('zh-CN-YunyangNeural', '云野'),
    ('zh-CN-XiaoyiNeural', '晓伊'),
    ('zh-CN-YunjianNeural', '云健'),
    ('zh-CN-YunxiaNeural', '云霞'),
]

async def test_voice_style(voice_id, voice_name, text_type, text):
    """测试发音人在特定文本类型下的表现"""
    try:
        output_file = f"test_{voice_id}_{text_type}.mp3"
        communicate = edge_tts.Communicate(text, voice_id)
        await asyncio.wait_for(communicate.save(output_file), timeout=5.0)
        
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            os.remove(output_file)
            return True, file_size
        return False, 0
    except:
        return False, 0

async def main():
    """主函数"""
    print("\n" + "="*70)
    print("测试发音人音色特点")
    print("="*70)
    print("\n提示：此脚本会生成测试音频，请试听后根据实际音色调整描述")
    print("="*70 + "\n")
    
    # 简单测试每个发音人
    for voice_id, voice_name in VOICES:
        print(f"\n测试 {voice_name} ({voice_id})...")
        test_text = "你好，这是一段测试语音，用于评估音色特点。"
        output_file = f"test_{voice_id.replace('-', '_')}.mp3"
        
        try:
            communicate = edge_tts.Communicate(test_text, voice_id)
            await asyncio.wait_for(communicate.save(output_file), timeout=5.0)
            
            if os.path.exists(output_file):
                file_size = os.path.getsize(output_file)
                print(f"  [OK] 生成成功 ({file_size} bytes)")
                print(f"  文件: {output_file}")
                print(f"  请试听后根据实际音色特点调整描述")
            else:
                print(f"  [FAIL] 生成失败")
        except Exception as e:
            print(f"  [FAIL] {e}")
        
        await asyncio.sleep(0.5)
    
    print("\n" + "="*70)
    print("测试完成！")
    print("="*70)
    print("\n根据 Azure TTS 官方文档，建议的描述：")
    print("\n云希 (YunxiNeural): 年轻男性，自然流畅，适合日常对话和一般内容")
    print("晓晓 (XiaoxiaoNeural): 年轻女性，活泼可爱，适合轻松内容和故事")
    print("云野 (YunyangNeural): 年轻男性，活泼开朗，适合儿童和娱乐内容")
    print("晓伊 (XiaoyiNeural): 成熟女性，知性优雅，适合商务和专业内容")
    print("云健 (YunjianNeural): 男性，充满活力，适合运动和激励内容")
    print("云霞 (YunxiaNeural): 成熟男性，沉稳专业，适合正式和培训内容")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
