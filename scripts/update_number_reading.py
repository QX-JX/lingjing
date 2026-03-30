import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# ========== 修复 handleNumberReadingSelect ==========
old_number_function = r"""  // 数字读法选择处理
  const handleNumberReadingSelect = async \(mode: string\) => \{
    if \(!textEditorRef\?\.current\) \{
      await dialog\.showAlert\('编辑器未初始化'\);
      return;
    \}

    const textarea = textEditorRef\.current;
    const selection = textarea\.getSelection\(\);

    // 检查是否有选中文本
    if \(selection\.start === selection\.end\) \{
      await dialog\.showAlert\('请先选中要添加数字读法的数字'\);
      return;
    \}

    const selectedText = selection\.text;

    // 验证选中的文本是否为数字（允许小数点和负号）
    const isNumber = /\^-\?\\d\+\(\\\.\\d\+\)\?\$/\.test\(selectedText\.trim\(\)\);

    if \(!isNumber\) \{
      await dialog\.showAlert\('只能选择数字！请选中纯数字后再使用此功能。'\);
      return;
    \}

    // 在选中文本外包裹数字读法标记
    const beforeSelection = text\.slice\(0, selection\.start\);
    const afterSelection = text\.slice\(selection\.end\);
    const markedText = `<number mode="\$\{mode\}">[\s\S]*?</number>`;
    const newText = beforeSelection \+ markedText \+ afterSelection;

    const newCharCount = getTextCharCount\(newText\);
    if \(newCharCount <= maxLength\) \{
      setText\(newText\);
      setTimeout\(\(\) => \{
        const newPosition = selection\.start \+ markedText\.length;
        textarea\.setCursorPosition\(newPosition\);
        textarea\.focus\(\);
      \}, 0\);
    \} else \{
      await dialog\.showAlert\(`文本长度超出限制（\$\{newCharCount\} / \$\{maxLength\}）`\);
    \}

    setIsNumberReadingDropdownOpen\(false\);
  \};"""

new_number_function = """  // 数字读法选择处理
  const handleNumberReadingSelect = async (mode: string) => {
    console.log('[Toolbar] handleNumberReadingSelect - 数字读法选择', { mode });

    if (!textEditorRef?.current) {
      await dialog.showAlert('编辑器未初始化');
      return;
    }

    const textarea = textEditorRef.current;
    const container = textarea.getContainer();
    if (!container) {
      console.warn('[Toolbar] 容器不存在');
      return;
    }

    // 检查是否有选中文本
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      await dialog.showAlert('请先选中要添加数字读法的数字');
      return;
    }

    const selectedPlainText = selection.toString();

    // 验证选中的文本是否为数字（允许小数点和负号）
    const isNumber = /^-?\\d+(\\.\\d+)?$/.test(selectedPlainText.trim());

    if (!isNumber) {
      await dialog.showAlert('只能选择数字！请选中纯数字后再使用此功能。');
      return;
    }

    // 使用 DOM Range API 精确地添加数字读法标记
    const result = applyMarkerWithDOM(
      container,
      selection,
      'number',
      { mode }, // number 标记有 mode 属性
      extractTextFromRendered
    );

    if (!result) {
      await dialog.showAlert('无法应用数字读法标记，选中内容不一致');
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
      await dialog.showAlert(`文本长度超出限制（${newCharCount} / ${maxLength}）`);
    }

    setIsNumberReadingDropdownOpen(false);
  };"""

# 执行替换
match = re.search(old_number_function, content)
if match:
    content = content[:match.start()] + new_number_function + content[match.end():]
    print("✓ 已替换 handleNumberReadingSelect 函数")
else:
    print("✗ 未找到 handleNumberReadingSelect 函数，尝试简单匹配...")
    # 尝试更简单的匹配模式
    simple_pattern = r"  // 数字读法选择处理\n  const handleNumberReadingSelect = async \(mode: string\) => \{[\s\S]*?\n    setIsNumberReadingDropdownOpen\(false\);\n  \};"
    match = re.search(simple_pattern, content)
    if match:
        content = content[:match.start()] + new_number_function + content[match.end():]
        print("✓ 已替换 handleNumberReadingSelect 函数（简单匹配）")
    else:
        print("✗ 仍未找到，跳过")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ 数字读法功能已更新!")
