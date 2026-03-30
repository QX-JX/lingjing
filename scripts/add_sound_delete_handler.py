import re

# 读取文件
with open(r"d:\ai-voice-new\tauri-app\src\components\TextEditor.tsx", "r", encoding="utf8") as f:
    content = f.read()

# 在 handleClick 函数中，在重读标记删除处理之后添加音效标记删除处理
# 找到重读标记删除的代码块结束位置

reread_delete_marker = """      // 检查是否点击了重读标记的关闭按钮
      const rereadClose = target.closest('.reread-close');
      if (rereadClose) {
        e.preventDefault();
        e.stopPropagation();

        const rereadWrapper = rereadClose.closest('.reread-marker-wrapper');
        if (rereadWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.reread-marker-wrapper'));
          const wrapperIndex = allWrappers.indexOf(rereadWrapper);

          if (wrapperIndex !== -1) {
            const regex = /<reread>([^<]*)<\\/reread>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 只保留内容，移除 reread 标签
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }
    };"""

new_code_with_sound = """      // 检查是否点击了重读标记的关闭按钮
      const rereadClose = target.closest('.reread-close');
      if (rereadClose) {
        e.preventDefault();
        e.stopPropagation();

        const rereadWrapper = rereadClose.closest('.reread-marker-wrapper');
        if (rereadWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.reread-marker-wrapper'));
          const wrapperIndex = allWrappers.indexOf(rereadWrapper);

          if (wrapperIndex !== -1) {
            const regex = /<reread>([^<]*)<\\/reread>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match, content) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return content; // 只保留内容，移除 reread 标签
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }

      // 检查是否点击了音效标记的关闭按钮
      const soundClose = target.closest('.sound-close');
      if (soundClose) {
        e.preventDefault();
        e.stopPropagation();

        const soundWrapper = soundClose.closest('.sound-effect-marker');
        if (soundWrapper && editorRef.current) {
          const allWrappers = Array.from(editorRef.current.querySelectorAll('.sound-effect-marker'));
          const wrapperIndex = allWrappers.indexOf(soundWrapper);

          if (wrapperIndex !== -1) {
            // 在原始文本中移除对应的音效标记
            const regex = /<sound\\s+effect=["']([^"']+)["']\\s*\\/>/g;
            let matchIndex = 0;
            const newText = text.replace(regex, (_match) => {
              if (matchIndex === wrapperIndex) {
                matchIndex++;
                return ''; // 移除音效标记
              }
              matchIndex++;
              return _match;
            });
            setText(newText);
          }
        }
        return;
      }
    };"""

if "soundClose" not in content:
    content = content.replace(reread_delete_marker, new_code_with_sound)
    print("✓ 添加音效标记删除处理")
else:
    print("⚠ 音效标记删除处理已存在")

# 写回文件
with open(r"d:\ai-voice-new\tauri-app\src\components\TextEditor.tsx", "w", encoding="utf8") as f:
    f.write(content)

print("\n✅ TextEditor.tsx 更新完成!")
