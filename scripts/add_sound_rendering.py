import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\utils\textRenderer.ts", "r", encoding="utf8") as f:
    content = f.read()

# 在重读标记处理之后添加音效标记处理
# 找到 "return result;" 之前的位置（在 renderTextWithMarkers 函数中）

search_marker = "  return result;\n}"

sound_effect_code = """  // 匹配音效标记 <sound effect="applause" />
  const soundRegex = /<sound\\s+effect=["']([^"']+)["']\\s*\\/>/g;
  result = result.replace(soundRegex, (_match, effectId) => {
    const effect = getSoundEffectById(effectId);
    if (!effect) {
      console.warn(`[textRenderer] 未知的音效 ID: ${effectId}`);
      return `<span class="sound-effect-marker unknown group inline-flex items-center cursor-default select-none text-gray-500 mx-1 px-2 py-1 bg-gray-100 rounded-lg" contenteditable="false" data-effect-id="${effectId}">
        <span class="sound-icon">🔊</span>
        <span class="sound-name">未知音效</span>
        <span class="sound-close hidden group-hover:flex ml-1 cursor-pointer text-red-500 hover:text-red-700">×</span>
      </span>`;
    }

    // 样式：渐变背景（紫色系），音效图标+名称，悬停显示删除按钮
    return `<span class="sound-effect-marker group inline-flex items-center cursor-default select-none mx-1 px-2.5 py-1 rounded-lg" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;" contenteditable="false" data-effect-id="${effectId}">
      <span class="sound-icon text-base mr-1.5">${effect.icon}</span>
      <span class="sound-name text-sm font-medium">${effect.name}</span>
      <span class="sound-close hidden group-hover:flex ml-2 w-4 h-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full items-center justify-center text-xs leading-none cursor-pointer transition-colors" title="删除音效">×</span>
    </span>`;
  });

  return result;
}"""

if "soundRegex" not in content:
    content = content.replace(search_marker, sound_effect_code)
    print("✓ 添加音效标记渲染逻辑")
else:
    print("⚠ 音效标记渲染逻辑已存在，跳过")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\utils\textRenderer.ts", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅  textRenderer.ts 更新完成!")
