import Editor from '@monaco-editor/react';
import { useGameStore } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// Monaco Editor Wrapper — Cyberpunk-themed code editor
// ---------------------------------------------------------------------------

export function CodeEditor() {
  const playerCode = useGameStore((s) => s.playerCode);
  const setPlayerCode = useGameStore((s) => s.setPlayerCode);
  const phase = useGameStore((s) => s.phase);

  const isReadOnly = phase !== 'playing' && phase !== 'reviewing';

  return (
    <div className="editor-container" style={{ height: '100%', minHeight: '400px' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={playerCode}
        onChange={(value) => setPlayerCode(value ?? '')}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly: isReadOnly,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          tabSize: 2,
          wordWrap: 'on',
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
