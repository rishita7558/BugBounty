/**
 * @file CodeEditor.tsx
 * @description Monaco code editor integration with ICE MATRIX syntax theming.
 * Provides live code editing, side-by-side diff comparison against original buggy code,
 * bracket colorization, dynamic multi-language syntax switching (JS/TS/Python),
 * and keyboard shortcuts (Ctrl/Cmd+Enter) for submission.
 */

import Editor, { DiffEditor, type OnMount } from '@monaco-editor/react';
import { useGameStore } from '@/store/useGameStore';
import { getLanguageMeta, type SupportedLanguage } from '@/core/taxonomy/challengeTaxonomy';

let themeRegistered = false;

/**
 * Registers the custom ICE MATRIX editor color theme with Monaco.
 *
 * @param monaco The Monaco global namespace object.
 */
function registerIceMatrixTheme(monaco: any) {
  if (themeRegistered) return;
  const themeDef = {
    base: 'vs-dark' as const,
    inherit: true,
    rules: [
      { token: 'keyword',              foreground: '00D9FF', fontStyle: 'bold' },
      { token: 'keyword.control',      foreground: '00D9FF', fontStyle: 'bold' },
      { token: 'string',               foreground: '65CFFF' },
      { token: 'string.escape',        foreground: 'B8D8EA', fontStyle: 'italic' },
      { token: 'number',               foreground: 'B8D8EA' },
      { token: 'number.float',         foreground: 'B8D8EA' },
      { token: 'comment',              foreground: '516682', fontStyle: 'italic' },
      { token: 'comment.block',        foreground: '516682', fontStyle: 'italic' },
      { token: 'entity.name.function', foreground: '65CFFF', fontStyle: 'bold' },
      { token: 'support.function',     foreground: '65CFFF' },
      { token: 'entity.name.type',     foreground: '287BFF', fontStyle: 'bold' },
      { token: 'support.type',         foreground: '287BFF' },
      { token: 'variable',             foreground: 'EAF8FF' },
      { token: 'variable.parameter',   foreground: 'B8D8EA' },
      { token: 'operator',             foreground: '00D9FF' },
      { token: 'identifier',           foreground: 'EAF8FF' },
      { token: 'delimiter',            foreground: '8199B5' },
      { token: 'delimiter.bracket',    foreground: '00D9FF' },
      { token: 'regexp',               foreground: '65CFFF' },
      { token: 'tag',                  foreground: '00D9FF' },
      { token: 'tag.attribute.name',   foreground: '65CFFF' },
      { token: 'attribute.value',      foreground: 'B8D8EA' },
    ],
    colors: {
      'editor.background':                   '#050B18',
      'editor.foreground':                   '#EAF8FF',
      'editor.selectionBackground':          '#00D9FF35',
      'editor.inactiveSelectionBackground':  '#00D9FF1A',
      'editor.selectionHighlightBackground': '#00D9FF20',
      'editor.lineHighlightBackground':      '#081426',
      'editor.lineHighlightBorder':          '#00D9FF20',
      'editorCursor.foreground':             '#00D9FF',
      'editorGutter.background':             '#050B18',
      'editorLineNumber.foreground':         '#516682',
      'editorLineNumber.activeForeground':   '#00D9FF',
      'scrollbarSlider.background':          '#00D9FF25',
      'scrollbarSlider.hoverBackground':     '#00D9FF50',
      'scrollbarSlider.activeBackground':    '#00D9FF80',
      'editor.findMatchBackground':          '#287BFF50',
      'editor.findMatchHighlightBackground': '#287BFF30',
      'editorBracketMatch.background':       '#00D9FF25',
      'editorBracketMatch.border':           '#00D9FF',
      'editorIndentGuide.background1':       '#ffffff0D',
      'editorIndentGuide.activeBackground1': '#00D9FF35',
      'editorWidget.background':             '#081426',
      'editorWidget.border':                 '#00D9FF40',
      'editorSuggestWidget.background':      '#081426',
      'editorSuggestWidget.border':          '#00D9FF40',
      'editorSuggestWidget.selectedBackground': '#00D9FF25',
      'editorHoverWidget.background':        '#081426',
      'editorHoverWidget.border':            '#00D9FF40',
      'editorError.foreground':              '#FF3B69',
      'editorWarning.foreground':            '#B8D8EA',
    },
  };

  monaco.editor.defineTheme('ice-matrix', themeDef);
  monaco.editor.defineTheme('cyberpunk', themeDef); // backward compat
  themeRegistered = true;
}

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

/**
 * Properties accepted by the CodeEditor component.
 */
export interface CodeEditorProps {
  /** Whether side-by-side diff view is currently enabled. */
  showDiff?: boolean;
  /** Callback to toggle diff comparison view. */
  onToggleDiff?: () => void;
  /** Callback fired when the player triggers solution submission. */
  onSubmit?: () => void;
  /** Original buggy code snippet used for diff comparisons. */
  originalCode?: string;
}

/**
 * CodeEditor component encapsulating Monaco single-file and diff editors.
 *
 * @param props Component properties.
 * @returns Rendered Monaco editor workspace.
 */
export function CodeEditor({
  showDiff = false,
  onToggleDiff,
  onSubmit,
  originalCode = '',
}: CodeEditorProps) {
  const playerCode = useGameStore((s) => s.playerCode);
  const setPlayerCode = useGameStore((s) => s.setPlayerCode);
  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const selectedLanguage = useGameStore((s) => s.selectedLanguage);

  const isReadOnly = phase !== 'playing' && phase !== 'reviewing';

  // Resolve dynamic language across all supported languages
  const rawLang = ((challenge?.language as SupportedLanguage) || selectedLanguage || 'javascript').toLowerCase() as SupportedLanguage;
  const currentLang: SupportedLanguage = [
    'javascript',
    'typescript',
    'python',
    'rust',
    'go',
    'cpp',
    'java',
    'sql',
  ].includes(rawLang)
    ? rawLang
    : 'javascript';
  const meta = getLanguageMeta(currentLang);

  // Register theme and attach submission keybinding
  const handleMount: OnMount = (editor, monaco) => {
    registerIceMatrixTheme(monaco);
    monaco.editor.setTheme('ice-matrix');
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => onSubmit?.(),
    );
  };

  // DiffEditor mounting callback
  const handleDiffMount = (_: any, monaco: any) => {
    registerIceMatrixTheme(monaco);
    monaco.editor.setTheme('ice-matrix');
  };

  return (
    <div
      className="editor-container pixel-box hud-corner-brackets"
      style={{
        height: '100%',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        border: '2px solid rgba(0, 217, 255, 0.35)',
        boxShadow: '4px 4px 0px #050B18, 0 8px 30px rgba(5, 11, 24, 0.8)',
      }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 14px',
          background:     '#081426',
          borderBottom:   '2px solid rgba(0, 217, 255, 0.25)',
          flexShrink:     0,
        }}
      >
        {/* Dynamic Language badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily:    'var(--font-arcade)',
              fontSize:      '0.6rem',
              fontWeight:    700,
              color:         '#00D9FF',
              letterSpacing: '1px',
              textShadow:    '0 0 8px rgba(0, 217, 255, 0.6)',
              display:       'flex',
              alignItems:    'center',
              gap:           '5px',
            }}
          >
            <span style={{ width: '6px', height: '6px', background: '#00D9FF', boxShadow: '0 0 6px #00D9FF' }} />
            {meta.badgeLabel}
          </span>
          {challenge?.topic && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: '#8199B5',
                background: 'rgba(0, 217, 255, 0.08)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                padding: '2px 8px',
              }}
            >
              #{challenge.topic}
            </span>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: '#8199B5',
            letterSpacing: '0.5px',
          }}
        >
          {isReadOnly ? 'STATUS: READ ONLY' : 'SHORTCUT: [Ctrl+Enter] SUBMIT FIX'}
        </span>

        {/* Diff Mode toggle */}
        <button
          onClick={onToggleDiff}
          title="Compare your fix against the original buggy code"
          className="btn-pixel-cyber"
          style={{
            padding:      '5px 12px',
            fontSize:     '0.6rem',
            background:   showDiff ? 'rgba(0, 217, 255, 0.15)' : 'rgba(8, 20, 38, 0.6)',
            borderColor:  showDiff ? '#00D9FF' : 'rgba(129, 153, 181, 0.3)',
            color:        showDiff ? '#00D9FF' : '#8199B5',
            boxShadow:    showDiff ? '2px 2px 0px #050B18, 3px 3px 0px #00D9FF' : '2px 2px 0px #050B18',
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
            language={meta.monacoLanguage}
            original={originalCode}
            modified={playerCode}
            theme="ice-matrix"
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
            language={meta.monacoLanguage}
            value={playerCode}
            onChange={(value) => setPlayerCode(value ?? '')}
            theme="ice-matrix"
            options={{ ...EDITOR_OPTIONS, readOnly: isReadOnly }}
            onMount={handleMount}
          />
        )}
      </div>
    </div>
  );
}
