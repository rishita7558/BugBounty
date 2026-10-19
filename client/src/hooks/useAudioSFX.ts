import { useCallback, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// Web Audio API — Procedural Sound Synthesis Engine
// No pre-recorded files needed. Generates retro arcade sounds on the fly.
// ---------------------------------------------------------------------------

type SoundType = 'correct' | 'wrong' | 'combo' | 'tick' | 'hint' | 'gameover' | 'start' | 'click';

export function useAudioSFX() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      if (!soundEnabled) return;

      const ctx = getCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'correct':
          osc.type = 'square';
          osc.frequency.setValueAtTime(523, now);       // C5
          osc.frequency.setValueAtTime(659, now + 0.1); // E5
          osc.frequency.setValueAtTime(784, now + 0.2); // G5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;

        case 'wrong':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'combo':
          osc.type = 'square';
          osc.frequency.setValueAtTime(880, now);        // A5
          osc.frequency.setValueAtTime(1047, now + 0.08); // C6
          osc.frequency.setValueAtTime(1319, now + 0.16); // E6
          osc.frequency.setValueAtTime(1568, now + 0.24); // G6
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;

        case 'tick':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1000, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case 'hint':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(550, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;

        case 'gameover':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
          osc.start(now);
          osc.stop(now + 1);
          break;

        case 'start':
          osc.type = 'square';
          osc.frequency.setValueAtTime(262, now);
          osc.frequency.setValueAtTime(330, now + 0.1);
          osc.frequency.setValueAtTime(392, now + 0.2);
          osc.frequency.setValueAtTime(523, now + 0.3);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;

        case 'click':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
      }
    },
    [soundEnabled, getCtx]
  );

  return { play };
}
