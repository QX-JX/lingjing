import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# 1. 添加导入
search_import = "import { PolyphoneDropdown } from './PolyphoneDropdown';"
if "SoundEffectDropdown" not in content:
    content = content.replace(
        search_import,
        search_import + "\nimport { SoundEffectDropdown } from './Sound EffectDropdown';"
    )
    print("✓ 添加 SoundEffectDropdown 导入")

# 2. 在 useState 声明部分添加音效下拉状态
# 找到 polyphoneButtonRef 之后添加
search_ref = "const polyphoneButtonRef = useRef<HTMLButtonElement>(null);"
if "soundEffectButtonRef" not in content:
    addition = "\n  const soundEffectButtonRef = useRef<HTMLButtonElement>(null);\n  const [isSoundEffectDropdownOpen, setIsSoundEffectDropdownOpen] = useState(false);\n  const [soundEffectDropdownPosition, setSoundEffectDropdownPosition] = useState({ x: 0, y: 0 });"
    content = content.replace(search_ref, search_ref + addition)
    print("✓ 添加音效状态变量")

# 3. 修改 handleFeatureClick 中的 specialEffects case
old_case = """      case 'specialEffects':
        alert('特效音功能：将在后续版本中实现');
        break;"""

new_case = """      case 'specialEffects':
        handleSoundEffectClick();
        break;"""

content = content.replace(old_case, new_case)
print("✓ 更新 handleFeatureClick 中的 specialEffects case")

# 4. 在 handlePolyphoneSelect 之后添加音效处理函数
insert_marker = "  const handlePolyphoneSelect ="
insert_pos = content.find(insert_marker)
if insert_pos != -1:
    # 找到 handlePolyphoneSelect 函数结束位置
    function_end = content.find("};", insert_pos) + 3  # +3 for "};\n"
    
    new_functions = """
  // 特效音功能
  const handleSoundEffectClick = () => {
    console.log('[Toolbar] handleSoundEffectClick - 特效音按钮被点击');
    if (soundEffectButtonRef.current) {
      const rect = soundEffectButtonRef.current.getBoundingClientRect();
      setSoundEffectDropdownPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
      });
      setIsSoundEffectDropdownOpen(true);
    }
  };

  const handleSoundEffectSelect = (effectId: string) => {
    console.log('[Toolbar] handleSoundEffectSelect - 选择音效', { effectId });
    
    if (!textEditorRef?.current) return;
    
    const textarea = textEditorRef.current;
    const cursorPos = textarea.getCursorPosition();
    
    const soundTag = `<sound effect="${effectId}" />`;
    const newText = text.slice(0, cursorPos) + soundTag + text.slice(cursorPos);
    
    const newCharCount = getTextCharCount(newText);
    if (newCharCount <= maxLength) {
      console.log('[Toolbar] 插入音效标记');
      setText(newText);
      setTimeout(() => {
        textarea.setCursorPosition(cursorPos + soundTag.length);
        textarea.focus();
      }, 0);
    } else {
      console.error('[Toolbar] 文本长度超出限制');
      alert(`文本长度超出限制（${newCharCount} / ${maxLength}）`);
    }
    
    setIsSoundEffectDropdownOpen(false);
  };
"""
    
    content = content[:function_end] + new_functions + content[function_end:]
    print("✓ 添加音效处理函数")

# 5. 在 buttons 数组的 specialEffects 项添加 ref
old_button = """    {
      id: 'specialEffects',
      showSeparator: true,
      label: '特效音',
      icon: Music,
      onClick: () => handleFeatureClick('specialEffects'),
      isActive: activeButtons.has('specialEffects'),
    },"""

# 不需要修改按钮定义，因为ref是通过渲染时的条件判断添加的

# 6. 在渲染部分的 button ref 逻辑中添加 specialEffects 的处理
# 找到 ref= 那一行
ref_line_pattern = r"(ref=\{button\.id === 'insertPause' \? pauseButtonRef : button\.id === 'speedChange' \? speedButtonRef : button\.id === 'numericReading' \? numberReadingButtonRef : button\.id === 'polyphonic' \? polyphoneButtonRef : undefined\})"
new_ref_line = r"ref={button.id === 'insertPause' ? pauseButtonRef : button.id === 'speedChange' ? speedButtonRef : button.id === 'numericReading' ? numberReadingButtonRef : button.id === 'polyphonic' ? polyphoneButtonRef : button.id === 'specialEffects' ? soundEffectButtonRef : undefined}"

content = re.sub(ref_line_pattern, new_ref_line, content)
print("✓ 更新按钮 ref 逻辑")

# 7. 在渲染部分添加 SoundEffectDropdown 组件
# 找到 PolyphoneDropdown 之后的位置
polyphone_dropdown_marker = "</PolyphoneDropdown>\n                )}\n              </div>"
insert_pos = content.find(polyphone_dropdown_marker)

if insert_pos != -1:
    insert_pos += len(polyphone_dropdown_marker)
    sound_dropdown_component = """
                {button.id === 'specialEffects' && isSoundEffectDropdownOpen && (
                  <SoundEffectDropdown
                    isOpen={isSoundEffectDropdownOpen}
                    onClose={() => setIsSoundEffectDropdownOpen(false)}
                    onSelect={handleSoundEffectSelect}
                    position={soundEffectDropdownPosition}
                  />
                )}"""
    
    content = content[:insert_pos] + sound_dropdown_component + content[insert_pos:]
    print("✓ 添加 SoundEffectDropdown 组件渲染")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ Toolbar 集成完成!")
