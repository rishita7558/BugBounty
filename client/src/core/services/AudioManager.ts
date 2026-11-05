/**
 * @file AudioManager.ts
 * @description Centralized Web Audio API manager for BugBounty.
 * Safely handles browser autoplay policies by attaching window gesture listeners
 * to resume and unlock the AudioContext on the first user interaction.
 */

import { AudioPlaybackError } from '@/core/errors/AppErrors';

export class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private isGestureBound = false;
  private hasUnlocked = false;

  private readonly gestureEvents: (keyof WindowEventMap)[] = [
    'click',
    'keydown',
    'touchstart',
    'pointerdown',
  ];

  private constructor() {
    this.setupGestureUnlock();
  }

  /**
   * Retrieves the singleton instance of the AudioManager.
   *
   * @returns Shared AudioManager instance.
   */
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Returns the underlying AudioContext, creating it if necessary.
   *
   * @returns Active AudioContext or null in non-browser environments.
   */
  public getContext(): AudioContext | null {
    if (!this.audioContext && typeof window !== 'undefined') {
      try {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (AudioCtxClass) {
          this.audioContext = new AudioCtxClass();
        }
      } catch (err) {
        console.warn('[AudioManager] Failed to initialize AudioContext:', err);
      }
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.resumeContext().catch(() => {});
    }

    return this.audioContext;
  }

  /**
   * Static convenience accessor to get the current AudioContext.
   */
  public static getContext(): AudioContext | null {
    return AudioManager.getInstance().getContext();
  }

  /**
   * Safely attempts to resume the AudioContext to comply with autoplay requirements.
   *
   * @returns Promise resolving to true if the context is running, false otherwise.
   */
  public async resumeContext(): Promise<boolean> {
    if (!this.audioContext) {
      this.getContext();
    }

    if (!this.audioContext) {
      return false;
    }

    if (this.audioContext.state === 'running') {
      this.hasUnlocked = true;
      this.removeGestureListeners();
      return true;
    }

    try {
      await this.audioContext.resume();
      if ((this.audioContext.state as AudioContextState) === 'running') {
        this.hasUnlocked = true;
        this.removeGestureListeners();
        return true;
      }
    } catch (err) {
      console.warn('[AudioManager] AudioContext resume failed:', err);
    }

    return false;
  }

  /**
   * Static helper to safely resume the audio context.
   */
  public static async resumeContext(): Promise<boolean> {
    return AudioManager.getInstance().resumeContext();
  }

  /**
   * Registers passive gesture listeners on the global window to unlock audio
   * as soon as any user interaction occurs (click, keydown, touch, pointer).
   */
  public setupGestureUnlock(): void {
    if (typeof window === 'undefined' || this.isGestureBound || this.hasUnlocked) {
      return;
    }

    this.gestureEvents.forEach((eventName) => {
      window.addEventListener(eventName, this.handleUserGesture, {
        passive: true,
        capture: true,
      });
    });

    this.isGestureBound = true;
  }

  /**
   * Static helper to register gesture unlock listeners.
   */
  public static setupGestureUnlock(): void {
    AudioManager.getInstance().setupGestureUnlock();
  }

  /**
   * Removes gesture listeners once the AudioContext is running.
   */
  private removeGestureListeners(): void {
    if (typeof window === 'undefined' || !this.isGestureBound) {
      return;
    }

    this.gestureEvents.forEach((eventName) => {
      window.removeEventListener(eventName, this.handleUserGesture, {
        capture: true,
      });
    });

    this.isGestureBound = false;
  }

  /**
   * Event listener handler invoked on the first user interaction.
   */
  private handleUserGesture = async (): Promise<void> => {
    await this.resumeContext();
  };

  /**
   * Checks whether the audio context is unlocked and ready for playback.
   */
  public isUnlocked(): boolean {
    return (
      this.hasUnlocked ||
      (this.audioContext !== null && this.audioContext.state === 'running')
    );
  }

  /**
   * Static check for whether audio is unlocked.
   */
  public static isUnlocked(): boolean {
    return AudioManager.getInstance().isUnlocked();
  }

  /**
   * Synthesizes a procedural tone using the managed AudioContext.
   *
   * @param freq Frequency in Hertz.
   * @param type Oscillator waveform type.
   * @param duration Duration in seconds.
   * @param startDelay Delay in seconds before tone begins.
   * @param gainLevel Output volume gain.
   */
  public playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    startDelay = 0,
    gainLevel = 0.15
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
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
    } catch (err) {
      console.warn('[AudioManager] Tone synthesis error:', err);
      throw new AudioPlaybackError(
        'Failed to synthesize procedural audio tone.',
        `tone-${freq}hz`,
        { cause: err }
      );
    }
  }

  /**
   * Closes the underlying AudioContext and clears singleton state (useful for test teardown).
   */
  public async close(): Promise<void> {
    this.removeGestureListeners();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (err) {
        console.warn('[AudioManager] Error closing AudioContext:', err);
      }
    }
    this.audioContext = null;
    this.hasUnlocked = false;
    this.isGestureBound = false;
  }

  /**
   * Static reset helper for testing.
   */
  public static async reset(): Promise<void> {
    if (AudioManager.instance) {
      await AudioManager.instance.close();
      AudioManager.instance = null;
    }
  }
}

// Automatically bind gesture unlock listeners on module load if in browser
if (typeof window !== 'undefined') {
  AudioManager.setupGestureUnlock();
}
