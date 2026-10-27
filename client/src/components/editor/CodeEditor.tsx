import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react';
import { useGameStore } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// Cyberpunk Monaco Theme — registered once on first editor mount
// ---------------------------------------------------------------------------

let themeRegistered = false;

function registerCyberpunkTheme(monaco: any) {
  if (themeRegistered) return;
  monaco.editor.defineTheme('cyberpunk', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',              foreground: 'FF0055', fontStyle: 'bold' },
      { token: 'keyword.control',      foreground: 'FF0055', fontStyle: 'bold' },
      { token: 'string',               foreground: '00FFA3' },
      { token: 'string.escape',        foreground: '00FFA3', fontStyle: 'italic' },
      { token: 'number',               foreground: 'FFE600' },
      { token: 'number.float',         foreground: 'FFE600' },
      { token: 'comment',              foreground: '4a4a6a', fontStyle: 'italic' },
      { token: 'comment.block',        foreground: '4a4a6a', fontStyle: 'italic' },
      { token: 'entity.name.function', foreground: '00E5FF' },
      { token: 'support.function',     foreground: '00E5FF' },
      { token: 'entity.name.type',     foreground: 'FFE600' },
      { token: 'support.type',         foreground: 'FFE600' },
      { token: 'variable',             foreground: 'e8e8f0' },
      { token: 'variable.parameter',   foreground: 'c8c8e0' },
      { token: 'operator',             foreground: '00E5FF' },
      { token: 'identifier',           foreground: 'e8e8f0' },
      { token: 'delimiter',            foreground: '6a6a8a' },
      { token: 'delimiter.bracket',    foreground: '00E5FF' },
      { token: 'regexp',               foreground: '00FFA3' },
      { token: 'tag',                  foreground: 'FF0055' },
      { token: 'tag.attribute.name',   foreground: '00E5FF' },
      { token: 'attribute.value',      foreground: '00FFA3' },
    ],
    colors: {
      'editor.background':                   '#090A0F',
      'editor.foreground':                   '#e8e8f0',
      'editor.selectionBackground':          '#00FFA340',
      'editor.inactiveSelectionBackground':  '#00FFA320',
      'editor.selectionHighlightBackground': '#00FFA318',
      'editor.lineHighlightBackground':      '#121526',
      'editor.lineHighlightBorder':          '#00E5FF18',
      'editorCursor.foreground':             '#00FFA3',
      'editorGutter.background':             '#090A0F',
      'editorLineNumber.foreground':         '#4a4a6a',
      'editorLineNumber.activeForeground':   '#00E5FF',
      'scrollbarSlider.background':          '#00E5FF20',
      'scrollbarSlider.hoverBackground':     '#00E5FF50',
      'scrollbarSlider.activeBackground':    '#00E5FF80',
      'editor.findMatchBackground':          '#FFE60040',
      'editor.findMatchHighlightBackground': '#FFE60025',
      'editorBracketMatch.background':       '#00FFA320',
      'editorBracketMatch.border':           '#00FFA3',
      'editorIndentGuide.background1':       '#ffffff10',
      'editorIndentGuide.activeBackground1': '#00E5FF40',
      'editorWidget.background':             '#121526',
      'editorWidget.border':                 '#00E5FF40',
      'editorSuggestWidget.background':      '#121526',
      'editorSuggestWidget.border':          '#00E5FF40',
      'editorSuggestWidget.selectedBackground': '#00FFA320',
      'editorHoverWidget.background':        '#121526',
      'editorHoverWidget.border':            '#00E5FF40',
      'editorError.foreground':              '#FF0055',
      'editorWarning.foreground':            '#FFE600',
    },
  });
  themeRegistered = true;
}

// ---------------------------------------------------------------------------
// Shared editor options
// ---------------------------------------------------------------------------

const EDITOR_OPTIONS = {
  fontSize:                  14,
  fontFamily:                "'JetBrains Mono', 'Fira Code', monospace",
  fontLigatures:             true,
  minimap:                   { enabled: false },
  lineNumbers:               'on' as const,
  roundedSelection:          true,
  scrollBeyondLastLine:      false,
  automaticLayout:           true,
  padding:                   { top: 16, bottom: 16 },
  renderLineHighlight:       'all' as const,
  cursorBlinking:            'smooth' as const,
  cursorSmoothCaretAnimation:'on' as const,
  smoothScrolling:           true,
  bracketPairColorization:   { enabled: true },
  tabSize:                   2,
  wordWrap:                  'on' as const,
  suggest:                   { showKeywords: true, showSnippets: true },
  lineDecorationsWidth:      8,
  glyphMargin:               false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CodeEditorProps {
  showDiff?:      boolean;
  onToggleDiff?:  () => void;
  onSubmit?:      () => void;
  originalCode?:  string;
}

export function CodeEditor({
  showDiff     = false,
  onToggleDiff,
  onSubmit,
  originalCode = '',
}: CodeEditorProps) {
  const playerCode    = useGameStore((s) => s.playerCode);
  const setPlayerCode = useGameStore((s) => s.setPlayerCode);
  const phase         = useGameStore((s) => s.phase);

  const isReadOnly = phase !== 'playing' && phase !== 'reviewing';

  // Register theme & bind Ctrl+Enter on editor mount
  const handleMount: OnMount = (editor, monaco) => {
    registerCyberpunkTheme(monaco);
    monaco.editor.setTheme('cyberpunk');
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onSubmit?.(),
    );
  };

  // DiffEditor mount — only needs theme
  const handleDiffMount = (_: any, monaco: any) => {
    registerCyberpunkTheme(monaco);
    monaco.editor.setTheme('cyberpunk');
  };

  return (
    <div
      className="editor-container"
      style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '6px 12px',
          background:     '#090A0F',
          borderBottom:   '1px solid rgba(0,229,255,0.12)',
          flexShrink:     0,
        }}
      >
        {/* Language badge */}
        <span
          style={{
            fontFamily:    'var(--font-arcade)',
            fontSize:      '0.5rem',
            color:         '#00E5FF',
            letterSpacing: '2px',
            textShadow:    '0 0 8px rgba(0,229,255,0.6)',
          }}
        >
          ◈ JS
        </span>

        {/* Keyboard shortcut hint */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(136,136,160,0.5)' }}>
          {isReadOnly ? 'READ ONLY' : 'Ctrl+Enter to submit'}
        </span>

        {/* Diff Mode toggle */}
        <button
          onClick={onToggleDiff}
          title="Compare your fix against the original buggy code"
          style={{
            padding:      '4px 10px',
            fontSize:     '0.6rem',
            fontFamily:   'var(--font-mono)',
            fontWeight:   600,
            cursor:       'pointer',
            borderRadius: '4px',
            transition:   'all 0.2s',
            background:   showDiff ? 'rgba(0,255,163,0.15)' : 'transparent',
            border:       showDiff ? '1px solid #00FFA3' : '1px solid rgba(136,136,160,0.25)',
            color:        showDiff ? '#00FFA3' : 'rgba(136,136,160,0.6)',
            textShadow:   showDiff ? '0 0 8px rgba(0,255,163,0.5)' : 'none',
          }}
        >
          ⟺ DIFF MODE
        </button>
      </div>

      {/* ── Editor area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {showDiff ? (
          <DiffEditor
            height="100%"
            language="javascript"
            original={originalCode}
            modified={playerCode}
            theme="cyberpunk"
            options={{
              ...EDITOR_OPTIONS,
              readOnly:               true,
              renderSideBySide:       true,
              enableSplitViewResizing:true,
              originalEditable:       false,
            }}
            onMount={handleDiffMount}
          />
        ) : (
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={playerCode}
            onChange={(value) => setPlayerCode(value ?? '')}
            theme="cyberpunk"
            options={{ ...EDITOR_OPTIONS, readOnly: isReadOnly }}
            onMount={handleMount}
          />
        )}
      </div>
    </div>
  );
}
