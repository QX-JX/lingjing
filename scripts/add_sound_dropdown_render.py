import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# 在文件末尾的 </div> 之前添加 SoundEffectDropdown 组件
# 找到最后的 return 语句的结束位置

search_marker = """      )}
    </div>
  );
}"""

replacement = """      )}

      {/* 特效音下拉菜单 */}
      {isSoundEffectDropdownOpen && (
        <SoundEffectDropdown
          isOpen={isSoundEffectDropdownOpen}
          onClose={() => setIsSoundEffectDropdownOpen(false)}
          onSelect={handleSoundEffectSelect}
          position={soundEffectDropdownPosition}
        />
      )}
    </div>
  );
}"""

if "SoundEffectDropdown" not in content or "<SoundEffectDropdown" not in content:
    content = content.replace(search_marker, replacement)
    print("✓ 添加 SoundEffectDropdown 组件渲染")
else:
    print("⚠ SoundEffectDropdown 组件已存在")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ Toolbar 渲染部分更新完成!")
