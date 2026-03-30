import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { TextEditorRef } from '../components/TextEditor';
import type { Editor } from '@tiptap/react';

interface TextEditorContextValue {
  textEditorRef: React.RefObject<TextEditorRef | null>;
  tiptapEditor: Editor | null;
  setTiptapEditor: (editor: Editor | null) => void;
}

const TextEditorContext = createContext<TextEditorContextValue | null>(null);

export function TextEditorProvider({ children }: { children: ReactNode }) {
  const textEditorRef = useRef<TextEditorRef>(null);
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);

  return (
    <TextEditorContext.Provider
      value={{
        textEditorRef,
        tiptapEditor,
        setTiptapEditor,
      }}
    >
      {children}
    </TextEditorContext.Provider>
  );
}

export function useTextEditor() {
  const context = useContext(TextEditorContext);
  if (!context) {
    throw new Error('useTextEditor must be used within TextEditorProvider');
  }
  return context;
}
