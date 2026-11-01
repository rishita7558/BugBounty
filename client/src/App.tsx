/**
 * @file App.tsx
 * @description Main application container for CodeDuel: BugBounty Arena.
 * Orchestrates game phases, Monaco code editor, sandboxed execution,
 * arcade countdown HUD, combo multipliers, state machines, and resilience error boundaries.
 */

import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { useArcadeTimer } from '@/hooks/useArcadeTimer';
import { useAudioSFX } from '@/hooks/useAudioSFX';
import { useCodeRunner } from '@/hooks/useCodeRunner';
import { generateChallenge, reviewCode } from '@/services/api';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { ArcadeHUD } from '@/components/arcade/ArcadeHUD';
import { Scoreboard } from '@/components/arcade/Scoreboard';
import { VictoryModal } from '@/components/modals/VictoryModal';
import { DefeatModal } from '@/components/modals/DefeatModal';
import { HintModal } from '@/components/modals/HintModal';
import { SurrenderModal } from '@/components/modals/SurrenderModal';
import { PlayerProfileModal } from '@/components/modals/PlayerProfileModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toAppError } from '@/core/errors/AppErrors';
import {
  decodeChallengeFromUrl,
  encodeChallengeToUrl,
  type ShareableChallengePayload,
} from '@/lib/lzShare';
import { getPlayerProfile } from '@/lib/db';
import { GameActionMachine } from '@/core/state/GameActionMachine';
import { HintStateMachine } from '@/core/state/HintStateMachine';
import { AudioManager } from '@/core/services/AudioManager';
import {
  Zap,
  Bug,
  Play,
  Send,
  Lightbulb,
  Volume2,
  VolumeX,
  RotateCcw,
  Terminal,
  Tv2,
  Flag,
  AlertCircle,
  X,
  Share2,
  User,
  Check,
} from 'lucide-react';

/**
 * Root interactive component for the CodeDuel BugBounty Arena.
 *
 * @returns Rendered arena interface protected by domain error boundaries.
 */
function App() {
  useArcadeTimer();
  const { play } = useAudioSFX();
  const { runCode, isRunning } = useCodeRunner();

  // State store subscriptions
  const phase = useGameStore((s) => s.phase);
  const challenge = useGameStore((s) => s.challenge);
  const playerCode = useGameStore((s) => s.playerCode);
  const difficulty = useGameStore((s) => s.difficulty);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const showDiff = useGameStore((s) => s.showDiff);
  const scanlinesEnabled = useGameStore((s) => s.scanlinesEnabled ?? s.crtEnabled);
  const screenShake = useGameStore((s) => s.screenShake);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const hintContext = useGameStore((s) => s.hintContext);
  const actionError = useGameStore((s) => s.actionError);

  // Store action dispatchers
  const setChallenge = useGameStore((s) => s.setChallenge);
  const setPhase = useGameStore((s) => s.setPhase);
  const submitReview = useGameStore((s) => s.submitReview);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const toggleDiff = useGameStore((s) => s.toggleDiff);
  const toggleScanlines = useGameStore((s) => s.toggleScanlines ?? s.toggleCRT);
  const triggerScreenShake = useGameStore((s) => s.triggerScreenShake);
  const resetGame = useGameStore((s) => s.resetGame);
  const clearActionError = useGameStore((s) => s.clearActionError);

  // Local component state
  const [loading, setLoading] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);

  /**
   * Initializes challenge state from URL hash if compressed challenge parameters are detected.
   */
  useEffect(() => {
    const shared = decodeChallengeFromUrl();
    if (shared && shared.code) {
      setChallenge({
        id: 'shared-' + Math.random().toString(36).substring(2, 8),
        title: shared.title || 'Shared Bug Challenge',
        description:
          shared.description ||
          `Shared challenge authored by ${shared.author || 'Anonymous Security Researcher'}. Inspect and resolve the issue.`,
        difficulty: shared.difficulty || 'medium',
        category: 'shared',
        buggyCode: shared.code,
        correctCode: '',
        bugLine: shared.bugLine || 1,
        bugDescription: 'Find and fix the intentional issue in this shared code.',
        hints: shared.hints || ['Examine code flow, variable scoping, and edge cases.'],
        testCases: (shared.tests || []).map((t) => ({
          input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
          expectedOutput:
            typeof t.expected === 'string' ? t.expected : JSON.stringify(t.expected),
        })),
        timeLimit: 120,
        points: 250,
      });
      setPhase('playing');
    }
  }, [setChallenge, setPhase]);

  /**
   * Integrates AudioManager with the window gesture listener to safely handle browser audio autoplay policies.
   */
  useEffect(() => {
    AudioManager.setupGestureUnlock();
  }, []);

  /**
   * Toggles the lightweight retro scanlines CSS filter on the document body.
   */
  useEffect(() => {
    document.body.classList.toggle('scanlines-active', scanlinesEnabled);
    document.body.classList.toggle('crt-active', scanlinesEnabled);
    return () => {
      document.body.classList.remove('scanlines-active');
      document.body.classList.remove('crt-active');
    };
  }, [scanlinesEnabled]);

  const activeError = localError || actionError;

  /**
   * Requests a new challenge from the backend challenge generation service.
   */
  const handleNewChallenge = useCallback(async () => {
    const guard = GameActionMachine.canRequestNextChallenge(phase, loading);
    if (!guard.allowed) {
      setLocalError(guard.error ?? 'Cannot start new challenge.');
      return;
    }

    setLoading(true);
    setLocalError(null);
    clearActionError();
    play('start');

    try {
      setPhase('loading');
      const ch = await generateChallenge(difficulty);
      setChallenge(ch);
      setConsoleOutput('');
      play('click');
    } catch (err: unknown) {
      const appErr = toAppError(err, 'Failed to generate challenge. Please check backend connection.');
      console.error('[Arena] Failed to generate challenge:', appErr);
      setLocalError(appErr.getUserFriendlyMessage());
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  }, [difficulty, phase, loading, setChallenge, setPhase, clearActionError, play]);

  /**
   * Dispatches player source code to the sandboxed Web Worker execution engine.
   */
  const handleRunCode = useCallback(async () => {
    const guard = GameActionMachine.canRunCode(phase, isRunning, playerCode);
    if (!guard.allowed) {
      setLocalError(guard.error ?? 'Cannot run code in current state.');
      return;
    }

    setLocalError(null);
    play('click');

    try {
      const result = await runCode(playerCode);
      const output = result.success
        ? `✅ Execution OK (${result.executionTime}ms)\n${result.output}`
        : `❌ Error (${result.executionTime}ms)\n${result.error}\n${result.output}`;
      setConsoleOutput(output);
    } catch (err: unknown) {
      const appErr = toAppError(err, 'Unknown execution engine fault.');
      console.error('[Arena] Code execution failed:', appErr);
      setConsoleOutput(`❌ Execution Failed: ${appErr.message}`);
      setLocalError(`Execution error: ${appErr.getUserFriendlyMessage()}`);
    }
  }, [phase, isRunning, playerCode, runCode, play]);

  /**
   * Initiates a progressive hint dialog governed by the HintStateMachine.
   */
  const handleOpenHint = useCallback(() => {
    const check = HintStateMachine.canRequestHint(hintContext, timeRemaining, phase);
    if (!check.allowed) {
      setLocalError(check.reason ?? 'Hint not available.');
      return;
    }
    setLocalError(null);
    setHintOpen(true);
    play('hint');
  }, [hintContext, timeRemaining, phase, play]);

  /**
   * Opens the surrender confirmation dialog.
   */
  const handleOpenSurrender = useCallback(() => {
    const guard = GameActionMachine.canSurrender(phase, submitting);
    if (!guard.allowed) {
      setLocalError(guard.error ?? 'Cannot surrender in current state.');
      return;
    }
    setLocalError(null);
    setSurrenderOpen(true);
    play('click');
  }, [phase, submitting, play]);

  /**
   * Submits player code fix to the automated code review service.
   */
  const handleSubmit = useCallback(async () => {
    if (!challenge) return;

    const guard = GameActionMachine.canSubmitFix(
      phase,
      submitting,
      timeRemaining,
      playerCode
    );
    if (!guard.allowed) {
      setLocalError(guard.error ?? 'Submission not allowed.');
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    play('click');

    try {
      const review = await reviewCode(challenge.buggyCode, playerCode, challenge.id);
      submitReview(review);
      play(review.correct ? 'correct' : 'wrong');
      if (review.correct && useGameStore.getState().combo > 1) {
        setTimeout(() => play('combo'), 300);
      }
      if (!review.correct) {
        triggerScreenShake();
      }
    } catch (err: unknown) {
      const appErr = toAppError(err, 'Automated code review service failed.');
      console.error('[Arena] Review failed:', appErr);
      setLocalError(`Review error: ${appErr.getUserFriendlyMessage()}`);
    } finally {
      setSubmitting(false);
    }
  }, [
    challenge,
    phase,
    submitting,
    timeRemaining,
    playerCode,
    submitReview,
    play,
    triggerScreenShake,
  ]);

  /**
   * Serializes current challenge state to a compressed URL hash for serverless sharing.
   */
  const handleShareChallenge = useCallback(async () => {
    if (!challenge) return;
    play('click');
    const profile = await getPlayerProfile();
    const payload: ShareableChallengePayload = {
      title: challenge.title,
      code: playerCode,
      difficulty: challenge.difficulty,
      description: challenge.description,
      bugLine: challenge.bugLine,
      hints: challenge.hints,
      tests: challenge.testCases.map((tc) => ({
        input: [tc.input],
        expected: tc.expectedOutput,
      })),
      author: profile.callsign,
    };

    const url = encodeChallengeToUrl(payload);
    try {
      await navigator.clipboard.writeText(url);
      setShareToast('Challenge URL copied to clipboard!');
      setTimeout(() => setShareToast(null), 4000);
    } catch {
      setShareToast('Failed to copy link. Check clipboard permissions.');
      setTimeout(() => setShareToast(null), 4000);
    }
  }, [challenge, playerCode, play]);

  return (
    <div
      className={screenShake ? 'animate-screen-shake' : ''}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* ── Navigation Header Subtree ────────────────────────────────────────── */}
      <ErrorBoundary componentName="ArenaHeader">
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
            <Bug
              size={28}
              color="var(--neon-cyan)"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,240,255,0.5))' }}
            />
            <h1 className="arcade-text neon-text" style={{ fontSize: '0.75rem', margin: 0 }}>
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
            {/* Player profile trigger */}
            <button
              className="btn-neon"
              onClick={() => {
                setProfileOpen(true);
                play('click');
              }}
              title="Player Profile & Hacker Badges"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Profile
              </span>
            </button>

            {/* Lightweight scanlines CSS filter toggle */}
            <button
              className="btn-neon"
              onClick={() => {
                toggleScanlines();
                play('click');
              }}
              style={{ padding: '8px', opacity: scanlinesEnabled ? 1 : 0.45 }}
              title={scanlinesEnabled ? 'Disable Scanlines Filter' : 'Enable Scanlines Filter'}
            >
              <span><Tv2 size={16} /></span>
            </button>

            {/* Audio synthesizer toggle */}
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
      </ErrorBoundary>

      {/* ── Main Arena Content Area ────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Scoreboard Subtree */}
        <ErrorBoundary componentName="Scoreboard">
          <Scoreboard />
        </ErrorBoundary>

        {/* Global Error Banner */}
        {activeError && (
          <div
            className="glass-card animate-shake"
            style={{
              padding: '12px 18px',
              border: '1px solid rgba(255, 0, 85, 0.4)',
              background: 'rgba(255, 0, 85, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--neon-red)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{activeError}</span>
            </div>
            <button
              onClick={() => {
                setLocalError(null);
                clearActionError();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--neon-red)',
                cursor: 'pointer',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Share Feedback Toast */}
        {shareToast && (
          <div
            className="glass-card animate-score-pop"
            style={{
              padding: '12px 18px',
              border: '1px solid var(--neon-green)',
              background: 'rgba(57, 255, 20, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'var(--neon-green)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} />
              <span>{shareToast}</span>
            </div>
            <button
              onClick={() => setShareToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--neon-green)',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Idle / Loading Phase ─────────────────────────────────────────── */}
        {(phase === 'idle' || phase === 'loading') && (
          <ErrorBoundary componentName="ChallengeLobby">
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
                <Bug
                  size={64}
                  color="var(--neon-cyan)"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(0,240,255,0.4))' }}
                />
              </div>

              <div>
                <h2
                  className="arcade-text neon-text"
                  style={{ fontSize: '1rem', marginBottom: '12px' }}
                >
                  Ready to Hunt Bugs?
                </h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
                  Locate and resolve vulnerabilities in procedural code challenges. Score points,
                  build daily calendar streaks, and climb the leaderboard in the arena.
                </p>
              </div>

              {/* Difficulty selector buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    className={`badge badge-${d}`}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 16px',
                      fontSize: '0.75rem',
                      border:
                        difficulty === d
                          ? '2px solid currentColor'
                          : '1px solid transparent',
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
                      <Zap size={20} /> Start Challenge
                    </>
                  )}
                </span>
              </button>
            </div>
          </ErrorBoundary>
        )}

        {/* ── Active Gameplay / Review Phase ───────────────────────────────── */}
        {(phase === 'playing' || phase === 'reviewing') && challenge && (
          <>
            {/* Challenge Info Header & Arcade HUD Subtrees */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'stretch',
                flexWrap: 'wrap',
              }}
            >
              {/* Challenge Overview Card */}
              <ErrorBoundary componentName="ChallengeOverview">
                <div
                  className="glass-card"
                  style={{ flex: 1, padding: '20px', minWidth: '300px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <span className={`badge badge-${challenge.difficulty}`}>
                      {challenge.difficulty}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(0,240,255,0.1)',
                        color: 'var(--neon-cyan)',
                        border: '1px solid rgba(0,240,255,0.2)',
                      }}
                    >
                      {challenge.category}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--neon-yellow)',
                      }}
                    >
                      +{challenge.points} pts
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                    {challenge.title}
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                    }}
                  >
                    {challenge.description}
                  </p>

                  {/* Hotkey notice & Serverless share action */}
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(0,229,255,0.1)',
                          border: '1px solid rgba(0,229,255,0.3)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          color: 'var(--neon-cyan)',
                          marginRight: '4px',
                        }}
                      >
                        Ctrl+Enter
                      </span>
                      to submit fix from editor
                    </div>

                    <button
                      onClick={handleShareChallenge}
                      style={{
                        background: 'rgba(0, 240, 255, 0.1)',
                        border: '1px solid var(--neon-cyan)',
                        color: 'var(--neon-cyan)',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.7rem',
                      }}
                      title="Copy compressed challenge link to clipboard"
                    >
                      <Share2 size={12} /> Share URL
                    </button>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Arcade Countdown HUD Subtree */}
              <ErrorBoundary componentName="ArcadeHUD">
                <ArcadeHUD />
              </ErrorBoundary>
            </div>

            {/* Monaco Editor & Sandbox Console Workspace Subtree */}
            <ErrorBoundary componentName="CodeEditorWorkspace">
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
                <CodeEditor
                  showDiff={showDiff}
                  onToggleDiff={toggleDiff}
                  onSubmit={handleSubmit}
                  originalCode={challenge.buggyCode}
                />

                {/* Sandbox terminal console */}
                <div
                  className="glass-card"
                  style={{
                    padding: '16px',
                    minHeight: '100px',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <Terminal size={14} color="var(--neon-green)" />
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Console
                    </span>
                    {isRunning && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.65rem',
                          color: 'var(--neon-yellow)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ⏳ running…
                      </span>
                    )}
                  </div>
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: consoleOutput.startsWith('✅')
                        ? 'var(--neon-green)'
                        : consoleOutput.startsWith('❌')
                        ? 'var(--neon-red)'
                        : 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                    }}
                  >
                    {consoleOutput || '// Run your code to inspect output...'}
                  </pre>
                </div>
              </div>
            </ErrorBoundary>

            {/* Action Controls Toolbar Subtree */}
            <ErrorBoundary componentName="ActionControls">
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                {/* Surrender button */}
                <button
                  className="btn-neon btn-neon-red"
                  onClick={handleOpenSurrender}
                  disabled={submitting}
                  title="Forfeit challenge and reveal reference solution"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Flag size={16} /> Surrender
                  </span>
                </button>

                {/* Progressive hint button */}
                <button
                  className="btn-neon btn-neon-yellow"
                  onClick={handleOpenHint}
                  disabled={
                    hintContext.hintsUsed >= hintContext.maxHints || timeRemaining <= 0
                  }
                  style={{
                    opacity:
                      hintContext.hintsUsed >= hintContext.maxHints || timeRemaining <= 0
                        ? 0.5
                        : 1,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={16} /> Hint ({hintContext.hintsUsed}/
                    {hintContext.maxHints})
                  </span>
                </button>

                {/* Sandboxed execution trigger */}
                <button
                  className="btn-neon"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  style={{ opacity: isRunning ? 0.5 : 1 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Play size={16} /> {isRunning ? 'Running...' : 'Run Tests'}
                  </span>
                </button>

                {/* Game reset button */}
                <button
                  className="btn-neon"
                  onClick={() => {
                    resetGame();
                    play('click');
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RotateCcw size={16} /> Reset
                  </span>
                </button>

                {/* Solution submission button */}
                <button
                  className="btn-neon btn-neon-green"
                  onClick={handleSubmit}
                  disabled={submitting || timeRemaining <= 0}
                  style={{ opacity: submitting || timeRemaining <= 0 ? 0.5 : 1 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={16} /> {submitting ? 'Reviewing...' : 'Submit Fix'}
                  </span>
                </button>
              </div>
            </ErrorBoundary>
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
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
        CodeDuel: BugBounty Arena — Scoring Engine • Calendar Streaks • Dexie Persistence • LZ-String Sharing
      </footer>

      {/* ── Modal Dialog Portals Subtree ──────────────────────────────────── */}
      <ErrorBoundary componentName="ModalSubsystem">
        <VictoryModal onNextChallenge={handleNewChallenge} />
        <DefeatModal onNextChallenge={handleNewChallenge} />
        <HintModal open={hintOpen} onClose={() => setHintOpen(false)} />
        <SurrenderModal open={surrenderOpen} onClose={() => setSurrenderOpen(false)} />
        <PlayerProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </ErrorBoundary>
    </div>
  );
}

export default App;
