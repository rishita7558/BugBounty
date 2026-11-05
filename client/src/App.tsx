/**
 * @file App.tsx
 * @description Main application container for BugBounty — ICE MATRIX Edition.
 * Orchestrates game phases, 3D interactive Ice Crystal canvas, Monaco code editor,
 * sandboxed Web Worker execution, cryogenic countdown HUD, combo multipliers,
 * state machines, and resilience error boundaries.
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
import { IceCrystalCanvas } from '@/components/arcade/IceCrystalCanvas';
import { VictoryModal } from '@/components/modals/VictoryModal';
import { DefeatModal } from '@/components/modals/DefeatModal';
import { HintModal } from '@/components/modals/HintModal';
import { SurrenderModal } from '@/components/modals/SurrenderModal';
import { EvaluationFailureModal } from '@/components/modals/EvaluationFailureModal';
import { PlayerProfileModal } from '@/components/modals/PlayerProfileModal';
import { LeaderboardModal } from '@/components/modals/LeaderboardModal';
import {
  BountySynthesisLabModal,
  type MatrixMode,
  type ClearanceDifficulty,
} from '@/components/modals/BountySynthesisLabModal';
import { useScoreStore } from '@/store/useScoreStore';
import { getLanguageMeta, getTopicById, type SupportedLanguage } from '@/core/taxonomy/challengeTaxonomy';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toAppError } from '@/core/errors/AppErrors';
import { decodeChallengeFromUrl } from '@/lib/lzShare';
import { recordClientQuestion, getClientQuestionExclusions } from '@/lib/db';

export type ChallengeStyle =
  | 'find-the-bug'
  | 'fix-the-code'
  | 'predict-the-output'
  | 'logic-hunt'
  | 'complete-the-code'
  | 'code-review'
  | 'edge-case-hunt';

export const CHALLENGE_STYLES: Array<{ id: ChallengeStyle; label: string; icon: string }> = [
  { id: 'find-the-bug', label: 'FIND BUG', icon: '🔍' },
  { id: 'fix-the-code', label: 'FIX CODE', icon: '⚡' },
  { id: 'predict-the-output', label: 'PREDICT OUTPUT', icon: '🎯' },
  { id: 'logic-hunt', label: 'LOGIC HUNT', icon: '🧠' },
  { id: 'complete-the-code', label: 'COMPLETE CODE', icon: '🧩' },
  { id: 'code-review', label: 'CODE REVIEW', icon: '🛡️' },
  { id: 'edge-case-hunt', label: 'EDGE CASES', icon: '⚠️' },
];
import { GameActionMachine } from '@/core/state/GameActionMachine';
import { HintStateMachine } from '@/core/state/HintStateMachine';
import { AudioManager } from '@/core/services/AudioManager';
import {
  Zap,
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
  User,
  Trophy,
  Layers,
  Shield,
  Cpu,
  Sparkles,
  Activity,
} from 'lucide-react';

/**
 * Root interactive component for BugBounty — ICE MATRIX.
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
  const selectedLanguage = useGameStore((s) => s.selectedLanguage);
  const selectedTopic = useGameStore((s) => s.selectedTopic);
  const seenChallengeIds = useGameStore((s) => s.seenChallengeIds);

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
  const setSelectedLanguage = useGameStore((s) => s.setSelectedLanguage);
  const setSelectedTopic = useGameStore((s) => s.setSelectedTopic);

  // Local component state
  const [loading, setLoading] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [surrenderOpen, setSurrenderOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [synthesisLabOpen, setSynthesisLabOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [evalFailureOpen, setEvalFailureOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ChallengeStyle>('fix-the-code');

  const sessionScore = useScoreStore((s) => s.sessionScore);
  const lifetimeScore = useScoreStore((s) => s.lifetimeScore);
  const hydrateScores = useScoreStore((s) => s.hydrateScores);

  useEffect(() => {
    hydrateScores();
  }, [hydrateScores]);

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
   * Keyboard Easter Egg: Shift + M triggers Ice Matrix Data Burst.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        setEasterEggActive(true);
        play('click');
        setTimeout(() => setEasterEggActive(false), 3000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [play]);

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
      // Retrieve persistent exclusions across browser restarts & sessions from IndexedDB
      const { excludeIds: dbExcludeIds, recentFingerprints } = await getClientQuestionExclusions();
      const combinedExcludeIds = Array.from(new Set([...seenChallengeIds, ...dbExcludeIds]));

      const ch = await generateChallenge({
        difficulty,
        language: selectedLanguage,
        topic: selectedTopic || undefined,
        challengeStyle: selectedStyle,
        excludeIds: combinedExcludeIds,
        recentFingerprints,
      });

      // Persist to local IndexedDB to guarantee strict no-repetition
      await recordClientQuestion(ch);

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
  }, [
    difficulty,
    selectedLanguage,
    selectedTopic,
    selectedStyle,
    seenChallengeIds,
    phase,
    loading,
    setChallenge,
    setPhase,
    clearActionError,
    play,
  ]);

  /**
   * Saves the chosen language, topic, and difficulty into lobby state without immediately starting.
   */
  const handleEquipConfig = useCallback((selection: {
    language: SupportedLanguage;
    topicId: string;
    difficulty: ClearanceDifficulty;
    mode: MatrixMode;
  }) => {
    setSelectedLanguage(selection.language);
    setSelectedTopic(selection.topicId);
    setDifficulty(selection.difficulty);
    setSynthesisLabOpen(false);
    play('click');
  }, [play, setDifficulty, setSelectedLanguage, setSelectedTopic]);

  /**
   * Synthesizes and initiates a challenge from the Bounty Synthesis Lab modal.
   */
  const handleInitiateConfig = useCallback(async (selection: {
    language: SupportedLanguage;
    topicId: string;
    difficulty: ClearanceDifficulty;
    mode: MatrixMode;
  }) => {
    setSynthesisLabOpen(false);
    setLoading(true);
    setLocalError(null);
    clearActionError();
    play('start');

    setDifficulty(selection.difficulty);
    setSelectedLanguage(selection.language);
    setSelectedTopic(selection.topicId);

    try {
      setPhase('loading');
      const { excludeIds: dbExcludeIds, recentFingerprints } = await getClientQuestionExclusions();
      const combinedExcludeIds = Array.from(new Set([...seenChallengeIds, ...dbExcludeIds]));

      const ch = await generateChallenge({
        mode: selection.mode,
        difficulty: selection.difficulty,
        language: selection.language,
        topic: selection.topicId,
        challengeStyle: selectedStyle,
        excludeIds: combinedExcludeIds,
        recentFingerprints,
      });

      await recordClientQuestion(ch);
      setChallenge(ch);
      setConsoleOutput('');
      play('click');
    } catch (err: unknown) {
      const appErr = toAppError(err, 'Failed to synthesize bounty challenge.');
      console.error('[Arena] Failed to synthesize challenge:', appErr);
      setLocalError(appErr.getUserFriendlyMessage());
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  }, [
    clearActionError,
    play,
    seenChallengeIds,
    selectedStyle,
    setChallenge,
    setDifficulty,
    setPhase,
    setSelectedLanguage,
    setSelectedTopic,
  ]);

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
        ? `[OK] Execution Passed in ${result.executionTime}ms\n----------------------------------------\n${result.output}`
        : `[FAIL] Execution Error (${result.executionTime}ms)\n----------------------------------------\n${result.error}\n${result.output}`;
      setConsoleOutput(output);
    } catch (err: unknown) {
      const appErr = toAppError(err, 'Unknown execution engine fault.');
      console.error('[Arena] Code execution failed:', appErr);
      setConsoleOutput(`[CRITICAL] Execution Engine Failed: ${appErr.message}`);
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
      const review = await reviewCode({
        originalCode: challenge.buggyCode,
        fixedCode: playerCode,
        challengeId: challenge.id,
        language: (challenge as any).language || selectedLanguage,
        challengeStyle: (challenge as any).challengeStyle || selectedStyle,
        userAnswer: playerCode.trim(),
        selectedOptionId: (challenge as any).selectedOptionId || playerCode.trim(),
        testCases: challenge.testCases,
        correctCode: (challenge as any).correctCode,
        correctOptionId: (challenge as any).correctOptionId,
        expectedOutput: (challenge as any).expectedOutput,
        bugDescription: (challenge as any).bugDescription,
      });
      const isCorrect = !!(review.isCorrect ?? review.correct);
      submitReview({ ...review, correct: isCorrect, isCorrect });
      if (isCorrect) {
        const netDelta = useGameStore.getState().lastScoreBreakdown?.finalScore || challenge.points || 100;
        await useScoreStore.getState().recordBountyVictory(netDelta);
      }
      play(isCorrect ? 'correct' : 'wrong');
      if (isCorrect && useGameStore.getState().combo > 1) {
        setTimeout(() => play('combo'), 300);
      }
      if (!isCorrect) {
        triggerScreenShake();
        setEvalFailureOpen(true);
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

  return (
    <div
      className={screenShake ? 'animate-screen-shake' : ''}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#050B18',
        position: 'relative',
      }}
    >
      {/* ── Easter Egg Matrix Stream Banner ─────────────────────────────────── */}
      {easterEggActive && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'linear-gradient(90deg, #00D9FF, #287BFF, #65CFFF)',
            color: '#050B18',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 800,
            textAlign: 'center',
            padding: '6px',
            letterSpacing: '2px',
            boxShadow: '0 0 25px rgba(0, 217, 255, 0.8)',
          }}
        >
          ❄️ ICE MATRIX OVERCLOCK ACTIVE — QUANTUM RECEPTOR SYNCHRONIZED [SHIFT+M]
        </div>
      )}

      {/* ── Navigation Header Subtree ────────────────────────────────────────── */}
      <ErrorBoundary componentName="ArenaHeader">
        <header
          style={{
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
            backgroundColor: 'rgba(5, 11, 24, 0.92)',
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Logo & Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(40, 123, 255, 0.4))',
                border: '1px solid #00D9FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(0, 217, 255, 0.5)',
              }}
              className="pixel-box"
            >
              <Cpu size={18} color="#00D9FF" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    margin: 0,
                    letterSpacing: '1.5px',
                    color: '#EAF8FF',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  BUGBOUNTY
                </h1>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: '#00D9FF',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    border: '1px solid rgba(0, 217, 255, 0.35)',
                    padding: '1px 6px',
                    borderRadius: '2px',
                    background: 'rgba(0, 217, 255, 0.08)',
                  }}
                >
                  ICE MATRIX
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#8199B5',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '1px',
                }}
              >
                ADVANCED VULNERABILITY REMEDIATION ARENA
              </div>
            </div>
          </div>

          {/* Dual-Score System HUD */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: '2px solid #00f0ff',
              boxShadow: '2px 2px 0px #003366',
              borderRadius: '0px',
              padding: '6px 14px',
              background: '#081426',
              fontFamily: 'var(--font-arcade, monospace)',
              fontSize: '0.72rem',
              letterSpacing: '1px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#8199b5', fontSize: '0.62rem' }}>SESSION:</span>
              <span style={{ color: '#00f0ff', fontWeight: 800 }}>
                [{String(sessionScore).padStart(4, '0')}] PTS
              </span>
            </div>
            <span style={{ color: 'rgba(0, 240, 255, 0.4)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#8199b5', fontSize: '0.62rem' }}>LIFETIME:</span>
              <span style={{ color: '#65cfff', fontWeight: 800 }}>
                [{String(lifetimeScore).padStart(5, '0')}] PTS
              </span>
            </div>
          </div>

          {/* Quick Actions & Modals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Unified Bounty Synthesis Lab / Vulnerability Matrix Trigger */}
            <button
              className="btn-pixel-cyber"
              onClick={() => {
                setSynthesisLabOpen(true);
                play('click');
              }}
              title="Open Bounty Synthesis Lab (DSA vs Practical, Multi-Language Matrix, Topic & Difficulty Config)"
              style={{
                border: '2px solid #00f0ff',
                boxShadow: '2px 2px 0px #003366',
                borderRadius: '0px',
                background: '#0a1128',
                color: '#00f0ff',
                fontFamily: 'var(--font-arcade, monospace)',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Cpu size={14} color="#00f0ff" />
              <span>[SYNTHESIS LAB]</span>
              <span style={{ color: getLanguageMeta(selectedLanguage).color, fontSize: '0.65rem' }}>
                {getLanguageMeta(selectedLanguage).label.toUpperCase()}
              </span>
              {selectedTopic && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: '#8199B5',
                    maxWidth: '130px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  • {getTopicById(selectedTopic)?.name || selectedTopic}
                </span>
              )}
            </button>

            {/* Global Leaderboard trigger */}
            <button
              className="btn-pixel-cyber"
              onClick={() => {
                setLeaderboardModalOpen(true);
                play('click');
              }}
              title="Global Serverless Arcade Leaderboard"
            >
              <Trophy size={14} color="#00D9FF" />
              <span style={{ color: '#EAF8FF' }}>Leaderboard</span>
            </button>

            {/* Player profile trigger */}
            <button
              className="btn-pixel-cyber"
              onClick={() => {
                setProfileOpen(true);
                play('click');
              }}
              title="Player Profile & Security Badges"
            >
              <User size={14} color="#65CFFF" />
              <span style={{ color: '#EAF8FF' }}>Profile</span>
            </button>

            {/* Scanlines Filter Toggle */}
            <button
              className="btn-pixel-cyber"
              onClick={() => {
                toggleScanlines();
                play('click');
              }}
              style={{
                padding: '8px 12px',
                borderColor: scanlinesEnabled ? '#00D9FF' : 'rgba(129, 153, 181, 0.3)',
                background: scanlinesEnabled ? 'rgba(0, 217, 255, 0.15)' : 'rgba(8, 20, 38, 0.8)',
              }}
              title={scanlinesEnabled ? 'Disable Scanlines Filter' : 'Enable Scanlines Filter'}
            >
              <Tv2 size={14} color={scanlinesEnabled ? '#00D9FF' : '#8199B5'} />
            </button>

            {/* Audio Toggle */}
            <button
              className="btn-pixel-cyber"
              onClick={toggleSound}
              style={{ padding: '8px 12px' }}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 size={14} color="#00D9FF" /> : <VolumeX size={14} color="#8199B5" />}
            </button>
          </div>
        </header>
      </ErrorBoundary>

      {/* ── Main Arena Content Area ────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Global Error Banner */}
        {activeError && (
          <div
            className="pixel-box animate-screen-shake"
            style={{
              padding: '12px 18px',
              border: '1px solid rgba(255, 59, 105, 0.6)',
              background: 'rgba(255, 59, 105, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#FF3B69',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>[EXCEPTION] {activeError}</span>
            </div>
            <button
              onClick={() => {
                setLocalError(null);
                clearActionError();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF3B69',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── Idle / Loading Phase: CINEMATIC 3D ICE MATRIX HERO ───────────── */}
        {(phase === 'idle' || phase === 'loading') && (
          <ErrorBoundary componentName="IceMatrixHero">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
                gap: '32px',
                alignItems: 'center',
                padding: '24px 0',
              }}
            >
              {/* Left Column: Mission Narrative & Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Status HUD Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="pixel-status-badge">
                    SYSTEM STATUS: READY
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#8199B5',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    V8 • MULTI-LANG SANDBOX ENGAGED
                  </span>
                </div>

                {/* Oversized Futuristic Headline */}
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                      fontWeight: 800,
                      lineHeight: 1.08,
                      letterSpacing: '-0.5px',
                      color: '#EAF8FF',
                      margin: 0,
                    }}
                  >
                    HUNT BUGS. <br />
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #00D9FF 0%, #65CFFF 50%, #287BFF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 30px rgba(0, 217, 255, 0.4)',
                      }}
                    >
                      PATCH ZERO-DAYS.
                    </span>
                  </h2>
                  <p
                    style={{
                      color: '#8199B5',
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      marginTop: '14px',
                      maxWidth: '560px',
                    }}
                  >
                    Enter the high-stakes cybersecurity debugging playground. Inspect obfuscated
                    procedural code, isolate memory leaks, prototype corruptions, and injection vectors,
                    and submit airtight fixes before the cryogenic clock expires.
                  </p>
                </div>

                {/* Bento Configuration Card */}
                <div
                  className="pixel-box"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    background: 'rgba(8, 20, 38, 0.9)',
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                  }}
                >
                  {/* Selected Topic Badge */}
                  <div
                    onClick={() => {
                      setSynthesisLabOpen(true);
                      play('click');
                    }}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: 'rgba(5, 11, 24, 0.8)',
                      border: '1px solid rgba(0, 217, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                    title="Click to open Bounty Synthesis Lab & customize stack, vulnerability taxonomy, and difficulty"
                  >
                    <Layers size={20} color={getLanguageMeta(selectedLanguage).color} />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: getLanguageMeta(selectedLanguage).color,
                        }}
                      >
                        TARGET: {getLanguageMeta(selectedLanguage).label.toUpperCase()} •{' '}
                        {selectedTopic ? getTopicById(selectedTopic)?.name.toUpperCase() : 'ALL BUG DOMAINS'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#8199B5', marginTop: '2px' }}>
                        {selectedTopic
                          ? getTopicById(selectedTopic)?.description
                          : 'Dynamic procedural generation active across concurrency, logic, and injection flaws.'}
                      </div>
                    </div>
                  </div>

                  {/* Challenge Style Selector */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontFamily: 'var(--font-arcade)',
                        color: '#8199B5',
                        marginBottom: '8px',
                        letterSpacing: '1px',
                      }}
                    >
                      CHALLENGE STYLE:
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                        gap: '6px',
                      }}
                    >
                      {CHALLENGE_STYLES.map((style) => {
                        const active = selectedStyle === style.id;
                        return (
                          <button
                            key={style.id}
                            className="btn-pixel-cyber"
                            onClick={() => {
                              setSelectedStyle(style.id);
                              play('click');
                            }}
                            style={{
                              padding: '6px 8px',
                              fontSize: '0.55rem',
                              fontFamily: 'var(--font-arcade)',
                              borderColor: active ? '#00D9FF' : 'rgba(129, 153, 181, 0.25)',
                              background: active ? 'rgba(0, 217, 255, 0.2)' : 'rgba(5, 11, 24, 0.75)',
                              color: active ? '#00D9FF' : '#8199B5',
                              boxShadow: active ? '2px 2px 0px #050B18, 3px 3px 0px #00D9FF' : undefined,
                            }}
                          >
                            <span>{style.icon}</span> {style.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Difficulty selector buttons */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontFamily: 'var(--font-arcade)',
                        color: '#8199B5',
                        marginBottom: '8px',
                        letterSpacing: '1px',
                      }}
                    >
                      SELECT DIFFICULTY PROTOCOL:
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          className={`btn-difficulty${difficulty === d ? ' active' : ''}`}
                          onClick={() => {
                            setDifficulty(d);
                            play('click');
                          }}
                        >
                          {d === 'easy' && '▷ '}
                          {d === 'medium' && '▶ '}
                          {d === 'hard' && '◆ '}
                          {d.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Start CTA Button */}
                  <button
                    className="btn-pixel-primary"
                    onClick={handleNewChallenge}
                    disabled={loading}
                    style={{
                      padding: '16px 28px',
                      fontSize: '0.95rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                    }}
                  >
                    {loading ? (
                      <>
                        <Activity size={18} className="animate-spin" />
                        <span className="pixel-blink-cursor">INITIALIZING MATRIX SIMULATION</span>
                      </>
                    ) : (
                      <>
                        <Zap size={18} /> ENTER THE ARENA • INITIATE BOUNTY
                      </>
                    )}
                  </button>
                </div>

                {/* Telemetry Strip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    fontSize: '0.7rem',
                    color: '#8199B5',
                    fontFamily: 'var(--font-mono)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Shield size={12} color="#00D9FF" /> V8 WORKER ISOLATION
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Cpu size={12} color="#65CFFF" /> DEXIE PERSISTENCE
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Sparkles size={12} color="#B8D8EA" /> LZ-COMPRESSION SHARING
                  </span>
                </div>
              </div>

              {/* Right Column: Interactive 3D Ice Crystal Holographic Unit */}
              <div
                className="pixel-box hud-corner-brackets"
                style={{
                  minHeight: '440px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: 'radial-gradient(ellipse at center, rgba(8, 20, 38, 0.95) 0%, rgba(5, 11, 24, 0.98) 100%)',
                  border: '1px solid rgba(0, 217, 255, 0.35)',
                  boxShadow: '0 20px 50px rgba(5, 11, 24, 0.8), 0 0 30px rgba(0, 217, 255, 0.1)',
                }}
              >
                {/* 3D Holographic Canvas */}
                <IceCrystalCanvas />

                {/* Loading progress bar overlay */}
                {phase === 'loading' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <div className="pixel-loading-bar" />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.55rem',
                        fontFamily: 'var(--font-arcade)',
                        color: '#00D9FF',
                        whiteSpace: 'nowrap',
                      }}
                      className="pixel-blink-cursor"
                    >
                      GENERATING CHALLENGE
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        )}

        {/* ── Active Gameplay / Review Phase ───────────────────────────────── */}
        {(phase === 'playing' || phase === 'reviewing') && challenge && (
          <>
            {/* Scoreboard Subtree */}
            <ErrorBoundary componentName="Scoreboard">
              <Scoreboard />
            </ErrorBoundary>

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
                  className="pixel-box hud-corner-brackets"
                  style={{
                    flex: 1,
                    padding: '20px 24px',
                    minWidth: '300px',
                    background: 'rgba(8, 20, 38, 0.9)',
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    <span className={`badge badge-${challenge.difficulty}`}>
                      {challenge.difficulty.toUpperCase()}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(0, 217, 255, 0.1)',
                        color: '#00D9FF',
                        border: '1px solid rgba(0, 217, 255, 0.3)',
                      }}
                    >
                      {challenge.category.toUpperCase()}
                    </span>
                    {challenge.challengeStyle && (
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(40, 123, 255, 0.15)',
                          color: '#65CFFF',
                          border: '1px solid rgba(40, 123, 255, 0.4)',
                        }}
                      >
                        STYLE: {challenge.challengeStyle.toUpperCase().replace(/-/g, ' ')}
                      </span>
                    )}
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--font-arcade)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#00D9FF',
                        textShadow: '0 0 8px rgba(0, 217, 255, 0.5)',
                      }}
                    >
                      +{challenge.points} PTS
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      marginBottom: '8px',
                      color: '#EAF8FF',
                      fontFamily: 'var(--font-arcade)',
                      lineHeight: 1.4,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {challenge.title}
                  </h3>

                  <p
                    style={{
                      color: '#8199B5',
                      fontSize: '0.85rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {challenge.description}
                  </p>

                  {/* Hotkey notice & Serverless share action */}
                  <div
                    style={{
                      marginTop: '14px',
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
                        color: '#8199B5',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span
                        style={{
                          background: 'rgba(0, 217, 255, 0.12)',
                          border: '1px solid rgba(0, 217, 255, 0.4)',
                          borderRadius: '2px',
                          padding: '2px 6px',
                          color: '#00D9FF',
                          marginRight: '6px',
                        }}
                      >
                        Ctrl+Enter
                      </span>
                      to submit code fix from editor
                    </div>
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
                  minHeight: '480px',
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
                  className="pixel-box"
                  style={{
                    padding: '16px',
                    minHeight: '110px',
                    maxHeight: '220px',
                    overflow: 'auto',
                    background: '#050B18',
                    border: '1px solid rgba(0, 217, 255, 0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                      borderBottom: '1px solid rgba(129, 153, 181, 0.15)',
                      paddingBottom: '6px',
                    }}
                  >
                    <Terminal size={14} color="#00D9FF" />
                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: '#8199B5',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      SANDBOX EXECUTION CONSOLE
                    </span>
                    {isRunning && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '0.65rem',
                          color: '#00D9FF',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        [EXECUTING WORKER...]
                      </span>
                    )}
                  </div>
                  <pre
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      color: consoleOutput.startsWith('[OK]')
                        ? '#00D9FF'
                        : consoleOutput.startsWith('[FAIL]') || consoleOutput.startsWith('[CRITICAL]')
                        ? '#FF3B69'
                        : '#8199B5',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                    }}
                  >
                    {consoleOutput || 'Click [Run Tests] or edit code to inspect execution output.'}
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
                  className="btn-pixel-cyber"
                  onClick={handleOpenSurrender}
                  disabled={submitting}
                  style={{
                    borderColor: 'rgba(255, 59, 105, 0.5)',
                    color: '#FF3B69',
                    background: 'rgba(255, 59, 105, 0.08)',
                  }}
                  title="Forfeit challenge and reveal reference solution"
                >
                  <Flag size={14} color="#FF3B69" /> Surrender
                </button>

                {/* Progressive hint button */}
                <button
                  className="btn-pixel-cyber"
                  onClick={handleOpenHint}
                  disabled={hintContext.hintsUsed >= hintContext.maxHints || timeRemaining <= 0}
                  style={{
                    opacity: hintContext.hintsUsed >= hintContext.maxHints || timeRemaining <= 0 ? 0.5 : 1,
                  }}
                >
                  <Lightbulb size={14} color="#B8D8EA" /> Hint ({hintContext.hintsUsed}/
                  {hintContext.maxHints})
                </button>

                {/* Sandboxed execution trigger */}
                <button
                  className="btn-pixel-cyber"
                  onClick={handleRunCode}
                  disabled={isRunning}
                  style={{ opacity: isRunning ? 0.5 : 1 }}
                >
                  <Play size={14} color="#00D9FF" /> {isRunning ? 'Executing...' : 'Run Tests'}
                </button>

                {/* Next Challenge button */}
                <button
                  className="btn-pixel-cyber"
                  onClick={handleNewChallenge}
                  disabled={loading}
                  title="Generate a fresh non-repeating challenge"
                >
                  <Sparkles size={14} color="#65CFFF" /> Next Challenge
                </button>

                {/* Game reset button */}
                <button
                  className="btn-pixel-cyber"
                  onClick={() => {
                    resetGame();
                    play('click');
                  }}
                >
                  <RotateCcw size={14} color="#8199B5" /> Reset
                </button>

                {/* Solution submission button */}
                <button
                  className="btn-pixel-primary"
                  onClick={handleSubmit}
                  disabled={submitting || timeRemaining <= 0}
                  style={{
                    opacity: submitting || timeRemaining <= 0 ? 0.5 : 1,
                  }}
                >
                  <Send size={15} /> {submitting ? 'Verifying Fix...' : 'Submit Fix'}
                </button>
              </div>
            </ErrorBoundary>
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '14px 28px',
          borderTop: '1px solid rgba(0, 217, 255, 0.15)',
          backgroundColor: '#050B18',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: '#8199B5',
          fontFamily: 'var(--font-mono)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          BUGBOUNTY: ICE MATRIX • ADVANCED PIXEL CYBERPUNK • MULTI-LANGUAGE ARENA
        </div>
        <div style={{ color: '#00D9FF' }}>
          PRESS [SHIFT+M] FOR DATA MATRIX STREAM
        </div>
      </footer>

      {/* ── Modal Dialog Portals Subtree ──────────────────────────────────── */}
      <ErrorBoundary componentName="ModalSubsystem">
        <VictoryModal onNextChallenge={handleNewChallenge} />
        <EvaluationFailureModal
          open={evalFailureOpen}
          onClose={() => setEvalFailureOpen(false)}
          onNextChallenge={() => { setEvalFailureOpen(false); handleNewChallenge(); }}
          onSurrender={() => { setEvalFailureOpen(false); setSurrenderOpen(true); }}
        />
        <DefeatModal onNextChallenge={handleNewChallenge} />
        <HintModal open={hintOpen} onClose={() => setHintOpen(false)} />
        <SurrenderModal open={surrenderOpen} onClose={() => setSurrenderOpen(false)} />
        <PlayerProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        <LeaderboardModal
          open={leaderboardModalOpen}
          onClose={() => setLeaderboardModalOpen(false)}
        />
        <BountySynthesisLabModal
          open={synthesisLabOpen}
          onClose={() => setSynthesisLabOpen(false)}
          initialLanguage={selectedLanguage}
          initialTopicId={selectedTopic}
          initialDifficulty={difficulty}
          onEquip={handleEquipConfig}
          onInitiateSynthesis={handleInitiateConfig}
          isLoading={loading}
        />
      </ErrorBoundary>

      {/* Retro Arcade Loading Screen Overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            background: 'rgba(5, 11, 24, 0.94)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#081426',
              border: '2px solid #00f0ff',
              boxShadow: '4px 4px 0px #003366',
              borderRadius: '0px',
              padding: '28px',
              fontFamily: 'var(--font-arcade, monospace)',
              color: '#00f0ff',
            }}
          >
            <div style={{ fontSize: '0.85rem', marginBottom: '14px', letterSpacing: '1px' }}>
              &gt; SYNTHESIZING UNIQUE BOUNTY: {selectedLanguage.toUpperCase()} -&gt; {(selectedTopic || 'GENERAL').toUpperCase()}...
            </div>
            <div style={{ fontSize: '0.75rem', color: '#65cfff', marginBottom: '20px' }}>
              &gt; APPLYING ANTI-DUPLICATION ENGINE [OK]
            </div>
            <div
              style={{
                width: '100%',
                height: '20px',
                border: '2px solid #00f0ff',
                borderRadius: '0px',
                background: '#0a1128',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '85%',
                  background: 'repeating-linear-gradient(90deg, #00f0ff 0px, #00f0ff 10px, #0a1128 10px, #0a1128 14px)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                color: '#8199b5',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              <span>STATUS: SYNTHESIS_ACTIVE</span>
              <span className="pixel-blink-cursor">_CONNECTING</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
