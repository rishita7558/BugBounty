import { describe, it, expect } from 'vitest';
import {
  AppErrorCode,
  AppError,
  GameActionError,
  CodeExecutionError,
  NetworkApiError,
  StorageError,
  ChallengeValidationError,
  HintExhaustedError,
  AudioPlaybackError,
  UnknownAppError,
  isAppError,
  toAppError,
} from '../core/errors/AppErrors';

describe('AppErrors Domain Hierarchy', () => {
  it('instantiates GameActionError with appropriate error code and metadata', () => {
    const error = new GameActionError('Cannot surrender while idle', 'idle', 'surrender');
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(GameActionError);
    expect(error.code).toBe(AppErrorCode.GAME_ACTION_INVALID);
    expect(error.phase).toBe('idle');
    expect(error.action).toBe('surrender');
    expect(error.recoverable).toBe(true);
    expect(error.context).toEqual({ phase: 'idle', action: 'surrender' });
  });

  it('instantiates CodeExecutionError for timeouts and syntax issues', () => {
    const timeoutErr = new CodeExecutionError('Watchdog timer exceeded 2000ms', true, 2001);
    expect(timeoutErr.code).toBe(AppErrorCode.CODE_EXECUTION_TIMEOUT);
    expect(timeoutErr.executionTimeMs).toBe(2001);

    const runtimeErr = new CodeExecutionError('ReferenceError: x is not defined', false, 45);
    expect(runtimeErr.code).toBe(AppErrorCode.CODE_EXECUTION_FAILED);
    expect(runtimeErr.executionTimeMs).toBe(45);
  });

  it('instantiates NetworkApiError with rate limiting and status code handling', () => {
    const rateLimitErr = new NetworkApiError('Too many challenge requests', 429, '/api/challenge/generate');
    expect(rateLimitErr.code).toBe(AppErrorCode.RATE_LIMIT_EXCEEDED);
    expect(rateLimitErr.statusCode).toBe(429);
    expect(rateLimitErr.endpoint).toBe('/api/challenge/generate');

    const serverErr = new NetworkApiError('Internal gateway error', 502, '/api/challenge/review');
    expect(serverErr.code).toBe(AppErrorCode.NETWORK_REQUEST_FAILED);
    expect(serverErr.statusCode).toBe(502);
  });

  it('instantiates StorageError for database operations', () => {
    const readErr = new StorageError('Failed to read profile', 'read', 'profiles');
    expect(readErr.code).toBe(AppErrorCode.STORAGE_READ_FAILED);
    expect(readErr.table).toBe('profiles');
    expect(readErr.operation).toBe('read');

    const writeErr = new StorageError('Quota exceeded', 'write', 'scores');
    expect(writeErr.code).toBe(AppErrorCode.STORAGE_WRITE_FAILED);
  });

  it('instantiates ChallengeValidationError and HintExhaustedError', () => {
    const validErr = new ChallengeValidationError('Malformed hash', '#invalid-hash');
    expect(validErr.code).toBe(AppErrorCode.CHALLENGE_DECODE_FAILED);
    expect(validErr.rawPayload).toBe('#invalid-hash');

    const hintErr = new HintExhaustedError('Max hints reached', 3, 3);
    expect(hintErr.code).toBe(AppErrorCode.HINT_EXHAUSTED);
    expect(hintErr.hintsUsed).toBe(3);
    expect(hintErr.maxHints).toBe(3);
  });

  it('instantiates AudioPlaybackError with recoverable = true', () => {
    const audioErr = new AudioPlaybackError('AudioContext suspended', 'combo');
    expect(audioErr.code).toBe(AppErrorCode.AUDIO_PLAYBACK_FAILED);
    expect(audioErr.recoverable).toBe(true);
    expect(audioErr.soundType).toBe('combo');
  });

  it('serializes to JSON format accurately', () => {
    const error = new GameActionError('Invalid step', 'victory', 'submit');
    const json = error.toJSON();
    expect(json.name).toBe('GameActionError');
    expect(json.code).toBe(AppErrorCode.GAME_ACTION_INVALID);
    expect(json.message).toBe('Invalid step');
    expect(json.recoverable).toBe(true);
    expect(json.timestamp).toBeDefined();
    expect(json.context).toEqual({ phase: 'victory', action: 'submit' });
  });

  it('supports isAppError type guard', () => {
    const customErr = new UnknownAppError('Failure');
    const standardErr = new Error('Generic error');
    expect(isAppError(customErr)).toBe(true);
    expect(isAppError(standardErr)).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError('error message')).toBe(false);
  });

  it('normalizes arbitrary exceptions with toAppError', () => {
    const appErr = new GameActionError('Action failed');
    expect(toAppError(appErr)).toBe(appErr);

    const normalizedFromError = toAppError(new Error('Network offline'));
    expect(normalizedFromError).toBeInstanceOf(UnknownAppError);
    expect(normalizedFromError.message).toBe('Network offline');

    const normalizedFromString = toAppError('Something went wrong');
    expect(normalizedFromString).toBeInstanceOf(UnknownAppError);
    expect(normalizedFromString.message).toBe('Something went wrong');

    const normalizedFromUnknown = toAppError({ random: 123 }, 'Fallback fault');
    expect(normalizedFromUnknown).toBeInstanceOf(UnknownAppError);
    expect(normalizedFromUnknown.message).toBe('Fallback fault');
  });
});
