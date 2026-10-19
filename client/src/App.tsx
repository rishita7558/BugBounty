import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useArcadeTimer } from '@/hooks/useArcadeTimer';
import { useAudioSFX } from '@/hooks/useAudioSFX';
import { useCodeRunner } from '@/hooks/useCodeRunner';
import { generateChallenge, reviewCode } from '@/services/api';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { ArcadeTimer } from '@/components/arcade/ArcadeTimer';
import { Scoreboard } from '@/components/arcade/Scoreboard';
import { VictoryModal } from '@/components/modals/VictoryModal';
import { DefeatModal } from '@/components/modals/DefeatModal';
import { HintModal } from '@/components/modals/HintModal';
import { Zap, Bug, Play, Send, Lightbulb, Volume2, VolumeX, RotateCcw, Terminal } from 'lucide-react';

// ---------------------------------------------------------------------------
// App — CodeDuel: BugBounty Arena
// ---------------------------------------------------------------------------

function App() {
  useArcadeTimer();
  const { play } = useAudioSFX();
  const { runCode } = useCodeRunner();

  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const playerCode = useGameStore((s) => s.playerCode);
  const difficulty = useGameStore((s) => s.difficulty);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setChallenge = useGameStore((s) => s.setChallenge);
  const setPhase = useGameStore((s) => s.setPhase);
  const submitReview = useGameStore((s) => s.submitReview);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const resetGame = useGameStore((s) => s.resetGame);

  const [loading, setLoading] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Start New Challenge ──────────────────────────────────────────────────
  const handleNewChallenge = useCallback(async () => {
    setLoading(true);
    play('start');
    try {
      setPhase('loading');
      const ch = await generateChallenge(difficulty);
      setChallenge(ch);
      setConsoleOutput('');
      play('click');
    } catch (err) {
      console.error('Failed to generate challenge:', err);
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  }, [difficulty, setChallenge, setPhase, play]);

  // ── Run Code ─────────────────────────────────────────────────────────────
  const handleRunCode = useCallback(async () => {
    play('click');
    const result = await runCode(playerCode);
    const output = result.success
      ? `✅ Execution OK (${result.executionTime}ms)\n${result.output}`
      : `❌ Error (${result.executionTime}ms)\n${result.error}\n${result.output}`;
    setConsoleOutput(output);
  }, [playerCode, runCode, play]);

  // ── Submit Fix ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!challenge) return;
    setSubmitting(true);
    play('click');
    try {
      const review = await reviewCode(challenge.buggyCode, playerCode, challenge.id);
      submitReview(review);
      play(review.correct ? 'correct' : 'wrong');
      if (review.correct && useGameStore.getState().combo > 1) {
        setTimeout(() => play('combo'), 300);
      }
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [challenge, playerCode, submitReview, play]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bug size={28} color="var(--neon-cyan)" style={{ filter: 'drop-shadow(0 0 6px rgba(0,240,255,0.5))' }} />
          <h1
            className="arcade-text neon-text"
            style={{ fontSize: '0.75rem', margin: 0 }}
          >
            CodeDuel
          </h1>
          <span
            style={{
              fontSize: '0.6rem',
              color: 'var(--neon-magenta)',
              fontFamily: 'var(--font-arcade)',
              opacity: 0.7,
            }}
          >
            BugBounty Arena
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-neon"
            onClick={toggleSound}
            style={{ padding: '8px' }}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            <span>{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Scoreboard Row */}
        <Scoreboard />

        {/* ── Idle / Loading State ────────────────────────────────────── */}
        {(phase === 'idle' || phase === 'loading') && (
          <div
            className="glass-card"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <div className="animate-float">
              <Bug size={64} color="var(--neon-cyan)" style={{ filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.4))' }} />
            </div>

            <div>
              <h2
                className="arcade-text neon-text"
                style={{ fontSize: '1rem', marginBottom: '12px' }}
              >
                Ready to Hunt Bugs?
              </h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
                Find and fix bugs in dynamically generated code challenges.
                Score points, build combos, and climb the leaderboard — all powered by AI.
              </p>
            </div>

            {/* Difficulty Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  className={`badge badge-${d}`}
                  style={{
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '0.75rem',
                    border: difficulty === d ? '2px solid currentColor' : '1px solid transparent',
                    transform: difficulty === d ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s var(--ease-spring)',
                  }}
                  onClick={() => {
                    setDifficulty(d);
                    play('click');
                  }}
                >
                  {d.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              className="btn-neon btn-neon-green"
              onClick={handleNewChallenge}
              disabled={loading}
              style={{
                padding: '16px 32px',
                fontSize: '1rem',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? (
                  <>⏳ Generating Challenge...</>
                ) : (
                  <>
                    <Zap size={20} />
                    Start Challenge
                  </>
                )}
              </span>
            </button>
          </div>
        )}

        {/* ── Playing / Reviewing State ───────────────────────────────── */}
        {(phase === 'playing' || phase === 'reviewing') && challenge && (
          <>
            {/* Challenge Info + Timer Row */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'stretch',
                flexWrap: 'wrap',
              }}
            >
              {/* Challenge Card */}
              <div
                className="glass-card"
                style={{ flex: 1, padding: '20px', minWidth: '300px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className={`badge badge-${challenge.difficulty}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="badge" style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    color: 'var(--neon-cyan)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                  }}>
                    {challenge.category}
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-yellow)' }}>
                    +{challenge.points} pts
                  </span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  {challenge.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {challenge.description}
                </p>
              </div>

              {/* Timer */}
              <ArcadeTimer />
            </div>

            {/* Editor + Console Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr auto',
                gap: '16px',
                flex: 1,
                minHeight: '450px',
              }}
            >
              {/* Code Editor */}
              <CodeEditor />

              {/* Console Output */}
              <div
                className="glass-card"
                style={{
                  padding: '16px',
                  minHeight: '100px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Terminal size={14} color="var(--neon-green)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Console
                  </span>
                </div>
                <pre
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: consoleOutput.startsWith('✅') ? 'var(--neon-green)' : consoleOutput.startsWith('❌') ? 'var(--neon-red)' : 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                  }}
                >
                  {consoleOutput || '// Run your code to see output...'}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <button className="btn-neon" onClick={() => { setHintOpen(true); play('hint'); }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} />
                  Hint
                </span>
              </button>
              <button className="btn-neon" onClick={handleRunCode}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Play size={16} />
                  Run
                </span>
              </button>
              <button className="btn-neon" onClick={() => { resetGame(); play('click'); }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={16} />
                  Reset
                </span>
              </button>
              <button
                className="btn-neon btn-neon-green"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ opacity: submitting ? 0.5 : 1 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={16} />
                  {submitting ? 'Reviewing...' : 'Submit Fix'}
                </span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        CodeDuel: BugBounty Arena — 100% Client-Side Evaluation
      </footer>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <VictoryModal />
      <DefeatModal />
      <HintModal open={hintOpen} onClose={() => setHintOpen(false)} />
    </div>
  );
}

export default App;
