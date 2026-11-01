/**
 * @file AudioManager.test.ts
 * @description Unit tests for AudioManager Web Audio API handling and gesture unlock listeners.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '@/core/services/AudioManager';

describe('AudioManager Autoplay & Gesture Lifecycle', () => {
  let listeners: Record<string, Function[]> = {};

  beforeEach(async () => {
    listeners = {};
    (globalThis as unknown as { window: unknown }).window = {
      addEventListener: vi.fn((event: string, cb: Function) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: Function) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((fn) => fn !== cb);
        }
      }),
    };
    await AudioManager.reset();
  });

  afterEach(async () => {
    await AudioManager.reset();
    vi.restoreAllMocks();
  });

  it('provides a singleton instance', () => {
    const instanceA = AudioManager.getInstance();
    const instanceB = AudioManager.getInstance();
    expect(instanceA).toBe(instanceB);
  });

  it('registers window gesture listeners on setupGestureUnlock', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    AudioManager.setupGestureUnlock();

    const registeredEvents = addEventListenerSpy.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain('click');
    expect(registeredEvents).toContain('keydown');
    expect(registeredEvents).toContain('touchstart');
    expect(registeredEvents).toContain('pointerdown');
  });

  it('safely handles context resumption on user interaction', async () => {
    let resumed = false;
    let currentState: AudioContextState = 'suspended';
    const mockContext = {
      get state() {
        return currentState;
      },
      resume: vi.fn().mockImplementation(async () => {
        resumed = true;
        currentState = 'running';
      }),
      close: vi.fn(),
      currentTime: 0,
    } as unknown as AudioContext;

    const manager = AudioManager.getInstance();
    (manager as unknown as { audioContext: AudioContext }).audioContext = mockContext;

    expect(manager.isUnlocked()).toBe(false);
    const result = await manager.resumeContext();

    expect(result).toBe(true);
    expect(resumed).toBe(true);
    expect(manager.isUnlocked()).toBe(true);
  });

  it('removes window event listeners once audio context is running', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const mockContext = {
      state: 'running',
      resume: vi.fn(),
      close: vi.fn(),
    } as unknown as AudioContext;

    const manager = AudioManager.getInstance();
    (manager as unknown as { audioContext: AudioContext }).audioContext = mockContext;

    await manager.resumeContext();

    const removedEvents = removeEventListenerSpy.mock.calls.map((call) => call[0]);
    expect(removedEvents).toContain('click');
    expect(removedEvents).toContain('keydown');
    expect(removedEvents).toContain('touchstart');
    expect(removedEvents).toContain('pointerdown');
  });
});
