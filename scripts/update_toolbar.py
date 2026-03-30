import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "r", encoding="utf8") as f:
    content = f.read()

# 步骤 1: 添加导入语句
import_line = "} from '../utils/textMarkers';"
if "applyMarkerWithDOM" not in content:
    content = content.replace(
        import_line,
        import_line + "\nimport { applyMarkerWithDOM } from '../utils/markerHelper';"
    )
    print("✓ 已添加 applyMarkerWithDOM 导入")

# 步骤 2: 替换 handleReread 函数
# 匹配整个函数：从注释到函数结束
old_function_pattern = r"  // 重读功能（强调/重音）\n  const handleReread = async \(\) => \{[\s\S]*?\n  \};"

new_function = """  // 重读功能（强调/重音）
  const handleReread = async () => {
    console.log('[Toolbar] handleReread - 重读按钮被点击');

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
      await dialog.showAlert('请先选中要添加重读的文本');
      return;
    }

    const selectedPlainText = selection.toString();

    // 验证选中的文本是否为纯中文
    const isChinese = /^[\\u4e00-\\u9fa5]+$/.test(selectedPlainText);

    if (!isChinese) {
      await dialog.showAlert('仅支持中文！请选中纯中文文本。');
      return;
    }

    // 使用 DOM Range API 精确地添加重读标记
    const result = applyMarkerWithDOM(
      container,
      selection,
      'reread',
      {}, // reread 标记没有属性
      extractTextFromRendered
    );

    if (!result) {
      await dialog.showAlert('无法应用重读标记，选中内容不一致');
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
  };"""

# 执行替换  
match = re.search(old_function_pattern, content)
if match:
    content = content[:match.start()] + new_function + content[match.end():]
    print("✓ 已替换 handleReread 函数")
    print(f"  原函数长度: {match.end() - match.start()} 字符")
    print(f"  新函数长度: {len(new_function)} 字符")
else:
    print("✗ 未找到 handleReread 函数")
    exit(1)

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\Toolbar.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ 文件已成功更新!")
