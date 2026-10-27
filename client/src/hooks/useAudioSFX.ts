import { useCallback, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// Web Audio API — Procedural Sound Synthesis Engine
// No pre-recorded files needed. Generates retro arcade sounds on the fly.
// ---------------------------------------------------------------------------

type SoundType = 'correct' | 'wrong' | 'combo' | 'tick' | 'hint' | 'gameover' | 'start' | 'click' | 'keypress';

export function useAudioSFX() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, duration: number, startDelay = 0, gainLevel = 0.15) => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    const startTime = ctx.currentTime + startDelay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }, [soundEnabled, getCtx]);

  const playKeyClick = useCallback(() => {
    playTone(800, 'triangle', 0.04, 0, 0.06);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    // Celebratory arpeggio: C5 (523.25), E5 (659.25), G5 (783.99)
    playTone(523.25, 'sine', 0.1, 0, 0.15);
    playTone(659.25, 'sine', 0.1, 0.1, 0.15);
    playTone(783.99, 'sine', 0.25, 0.2, 0.15);
  }, [playTone]);

  const playFailure = useCallback(() => {
    // Descending buzzer on test failure
    playTone(180, 'sawtooth', 0.2, 0, 0.14);
    playTone(140, 'sawtooth', 0.3, 0.15, 0.14);
  }, [playTone]);

  const play = useCallback(
    (type: SoundType) => {
      if (!soundEnabled) return;

      switch (type) {
        case 'correct':
          playSuccess();
          break;

        case 'wrong':
          playFailure();
          break;

        case 'keypress':
        case 'click':
          playKeyClick();
          break;

        case 'combo':
          playTone(880, 'square', 0.1, 0, 0.12);
          playTone(1047, 'square', 0.1, 0.08, 0.12);
          playTone(1319, 'square', 0.1, 0.16, 0.12);
          playTone(1568, 'square', 0.25, 0.24, 0.12);
          break;

        case 'tick':
          playTone(1000, 'sine', 0.04, 0, 0.05);
          break;

        case 'hint':
          playTone(440, 'triangle', 0.15, 0, 0.1);
          playTone(550, 'triangle', 0.2, 0.15, 0.1);
          break;

        case 'gameover':
          playTone(440, 'sawtooth', 0.4, 0, 0.15);
          playTone(110, 'sawtooth', 0.6, 0.3, 0.15);
          break;

        case 'start':
          playTone(262, 'square', 0.1, 0, 0.12);
          playTone(330, 'square', 0.1, 0.1, 0.12);
          playTone(392, 'square', 0.1, 0.2, 0.12);
          playTone(523, 'square', 0.25, 0.3, 0.12);
          break;
      }
    },
    [soundEnabled, playSuccess, playFailure, playKeyClick, playTone]
  );

  return { play, playTone, playKeyClick, playSuccess, playFailure };
}
