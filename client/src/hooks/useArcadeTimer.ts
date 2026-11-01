/**
 * @file useArcadeTimer.ts
 * @description High-precision requestAnimationFrame-based countdown timer hook.
 * Avoids setInterval browser tab throttling and accumulator drift by calculating elapsed
 * high-resolution timestamps directly from RAF execution ticks.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';

/**
 * Custom React hook driving the active challenge countdown clock.
 */
export function useArcadeTimer(): void {
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
