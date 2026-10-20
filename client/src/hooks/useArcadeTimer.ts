import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';

// ---------------------------------------------------------------------------
// High-Precision Arcade Timer Hook
// Uses requestAnimationFrame for smooth 1-second ticks without drift.
// ---------------------------------------------------------------------------

export function useArcadeTimer() {
  const tickTimer = useGameStore((s) => s.tickTimer);
  const timerActive = useGameStore((s) => s.timerActive);
  const lastTickRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const loop = useCallback(
    function frame(timestamp: number) {
      if (!lastTickRef.current) lastTickRef.current = timestamp;

      const elapsed = timestamp - lastTickRef.current;
      if (elapsed >= 1000) {
        tickTimer();
        lastTickRef.current = timestamp - (elapsed % 1000);
      }

      rafRef.current = requestAnimationFrame(frame);
    },
    [tickTimer]
  );

  useEffect(() => {
    if (timerActive) {
      lastTickRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timerActive, loop]);
}
