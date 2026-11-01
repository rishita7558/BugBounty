import { describe, it, expect } from 'vitest';
import { GameActionMachine } from '../core/state/GameActionMachine';

describe('GameActionMachine Button Guards & State Transitions', () => {
  describe('Surrender Guard', () => {
    it('allows surrender in playing and reviewing phases', () => {
      expect(GameActionMachine.canSurrender('playing').allowed).toBe(true);
      expect(GameActionMachine.canSurrender('reviewing').allowed).toBe(true);
      expect(GameActionMachine.canSurrender('playing').targetPhase).toBe('defeat');
    });

    it('rejects surrender when already defeated or victorious', () => {
      expect(GameActionMachine.canSurrender('defeat').allowed).toBe(false);
      expect(GameActionMachine.canSurrender('victory').allowed).toBe(false);
      expect(GameActionMachine.canSurrender('idle').allowed).toBe(false);
      expect(GameActionMachine.canSurrender('loading').allowed).toBe(false);
    });

    it('rejects surrender while submission is in-flight', () => {
      const result = GameActionMachine.canSurrender('playing', true);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('in flight');
    });
  });

  describe('Run Code Guard', () => {
    it('allows execution when active and code is present', () => {
      const result = GameActionMachine.canRunCode('playing', false, 'function solve() { return 42; }');
      expect(result.allowed).toBe(true);
    });

    it('rejects execution if code is already running', () => {
      const result = GameActionMachine.canRunCode('playing', true, 'console.log("hi");');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('already running');
    });

    it('rejects execution if editor is empty or whitespace', () => {
      const result = GameActionMachine.canRunCode('playing', false, '   ');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects execution outside playing or reviewing phase', () => {
      expect(GameActionMachine.canRunCode('idle', false, 'console.log(1)').allowed).toBe(false);
      expect(GameActionMachine.canRunCode('victory', false, 'console.log(1)').allowed).toBe(false);
    });
  });

  describe('Next Challenge Guard', () => {
    it('allows next challenge from idle, victory, or defeat', () => {
      expect(GameActionMachine.canRequestNextChallenge('idle', false).allowed).toBe(true);
      expect(GameActionMachine.canRequestNextChallenge('victory', false).allowed).toBe(true);
      expect(GameActionMachine.canRequestNextChallenge('defeat', false).allowed).toBe(true);
    });

    it('blocks next challenge during active play or when loading', () => {
      expect(GameActionMachine.canRequestNextChallenge('playing', false).allowed).toBe(false);
      expect(GameActionMachine.canRequestNextChallenge('idle', true).allowed).toBe(false);
    });
  });

  describe('Submit Fix Guard', () => {
    it('allows submission in playing phase with valid code and time', () => {
      const result = GameActionMachine.canSubmitFix('playing', false, 45, 'function fix() {}');
      expect(result.allowed).toBe(true);
    });

    it('blocks submission if timer expired (timeRemaining <= 0)', () => {
      const result = GameActionMachine.canSubmitFix('playing', false, 0, 'function fix() {}');
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('blocks submission if empty code or already submitting', () => {
      expect(GameActionMachine.canSubmitFix('playing', true, 30, 'code').allowed).toBe(false);
      expect(GameActionMachine.canSubmitFix('playing', false, 30, '').allowed).toBe(false);
    });
  });
});

