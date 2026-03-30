import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# ========== 修复 handlePolyphoneSelect ==========
old_polyphone_function = r"""  const handlePolyphoneSelect = \(pronunciation: string\) => \{
    if \(!textEditorRef\?\.current\) return;
    const textarea = textEditorRef\.current;
    const selection = textarea\.getSelection\(\);

    const \{ newText, newPosition \} = wrapPolyphone\(text, selection\.start, selection\.end, pronunciation\);
    const newCharCount = getTextCharCount\(newText\);
    if \(newCharCount <= maxLength\) \{
      setText\(newText\);
      setTimeout\(\(\) => \{
        textarea\.setCursorPosition\(newPosition\);
        textarea\.focus\(\);
      \}, 0\);
    \}

    setIsPolyphoneDropdownOpen\(false\);
  \};"""

new_polyphone_function = """  const handlePolyphoneSelect = (pronunciation: string) => {
    console.log('[Toolbar] handlePolyphoneSelect - 多音字选择', { pronunciation });

    if (!textEditorRef?.current) return;
    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 使用 DOM Range API 精确地添加多音字标记
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      console.warn('[Toolbar] 没有选中文本');
      return;
    }

    const result = applyMarkerWithDOM(
      container,
      selection,
      'polyphone',
      { pronunciation }, // polyphone 标记有 pronunciation 属性
      extractTextFromRendered
    );

    if (!result) {
      console.error('[Toolbar] 无法应用多音字标记');
      return;
    }

    const { newText, newPosition } = result;
    const newCharCount = getTextCharCount(newText);

    console.log('[Toolbar] 字符数检查:', { newCharCount, maxLength, isValid: newCharCount <= maxLength });

    if (newCharCount <= maxLength) {
      console.log('[Toolbar] 设置新文本');
      setText(newText);
      setTimeout(() => {
        console.log('[Toolbar] 恢复光标位置:', newPosition);
        textarea.setCursorPosition(newPosition);
        textarea.focus();
      }, 0);
    } else {
      console.error('[Toolbar] 文本长度超出限制');
    }

    setIsPolyphoneDropdownOpen(false);
  };"""

# 执行替换
match = re.search(old_polyphone_function, content)
if match:
    content = content[:match.start()] + new_polyphone_function + content[match.end():]
    print("✓ 已替换 handlePolyphoneSelect 函数")
    print(f"  原函数长度: {match.end() - match.start()} 字符")
    print(f"  新函数长度: {len(new_polyphone_function)} 字符")
else:
    print("✗ 未找到 handlePolyphoneSelect 函数")
    # 显示第一次出现的位置
    search_text = "const handlePolyphoneSelect"
    idx = content.find(search_text)
    if idx != -1:
        print(f"找到函数起始位置: {idx}")
        print(f"函数前后内容:\n{content[idx:idx+500]}")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ 多音字功能已更新!")
