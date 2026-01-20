/**
 * TipTap 编辑器集成示例
 * 
 * 这个文件展示了如何在 TextEditor 中使用 TipTap 和 SpeedMark 扩展
 * 当你准备迁移现有的 TextEditor 到 TipTap 时，可以参考这个示例
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { SpeedMark } from '../extensions/SpeedMark';
import { useEffect } from 'react';
import { useTextEditor } from '../contexts/TextEditorContext';
import { useAppStore } from '../store/useAppStore';

interface TipTapEditorExampleProps {
  placeholder?: string;
  maxLength?: number;
}

export function TipTapEditorExample({ 
  placeholder = '请输入文本...',
  maxLength = 5000 
}: TipTapEditorExampleProps) {
  const { setTiptapEditor } = useTextEditor();
  const { text, setText } = useAppStore();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
      SpeedMark, // 添加 SpeedMark 扩展
    ],
    content: text,
    onUpdate: ({ editor }) => {
      // 当编辑器内容更新时，同步到 store
      const html = editor.getHTML();
      const textContent = editor.getText();
      setText(textContent); // 或者根据需要使用 HTML
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[400px] p-6 bg-white rounded-xl border-none outline-none text-gray-800 shadow-lg shadow-orange-100/50 focus:shadow-xl focus:shadow-orange-200/50 transition-all duration-200 text-base leading-relaxed prose prose-sm max-w-none',
      },
    },
  });

  // 将编辑器实例保存到 Context
  useEffect(() => {
    if (editor) {
      setTiptapEditor(editor);
      return () => {
        setTiptapEditor(null);
      };
    }
  }, [editor, setTiptapEditor]);

  // 同步 store 中的文本到编辑器
  useEffect(() => {
    if (editor && text !== editor.getText()) {
      editor.commands.setContent(text);
    }
  }, [text, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} />
      
      {/* 字符数统计 */}
      {editor.storage.characterCount.characters() > maxLength * 0.9 && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
          {editor.storage.characterCount.characters()} / {maxLength}
        </div>
      )}
    </div>
  );
}

/**
 * 使用 SpeedMark 的命令示例：
 * 
 * // 对选中文本应用 1.5 倍速
 * editor.commands.setSpeedMark({ rate: 1.5 });
 * 
 * // 切换速度标记
 * editor.commands.toggleSpeedMark({ rate: 1.5 });
 * 
 * // 移除速度标记
 * editor.commands.unsetSpeedMark();
 * 
 * // 检查当前选中文本是否有速度标记
 * const hasSpeedMark = editor.isActive('speedMark');
 * 
 * // 获取当前速度标记的倍率
 * const currentRate = editor.getAttributes('speedMark').rate;
 */
