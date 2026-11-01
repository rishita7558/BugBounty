/**
 * @file SurrenderModal.tsx
 * @description Confirmation modal dialog for surrendering the active debugging challenge.
 * Confirms forfeiture, resets active combo multiplier, and transitions game state to defeat.
 */

import { useGameStore } from '@/store/useGameStore';
import { Flag, AlertTriangle } from 'lucide-react';

/**
 * Properties accepted by the SurrenderModal component.
 */
export interface SurrenderModalProps {
  /** Whether the confirmation dialog is currently visible. */
  open: boolean;
  /** Callback invoked to close the confirmation modal without forfeiting. */
  onClose: () => void;
}

/**
 * SurrenderModal component providing confirmation guardrails before forfeiting a challenge.
 *
 * @param props Component properties.
 * @returns Rendered modal overlay or null if closed.
 */
export function SurrenderModal({ open, onClose }: SurrenderModalProps) {
  const surrender = useGameStore((s) => s.surrender);
  const challenge = useGameStore((s) => s.challenge);

  if (!open || !challenge) return null;

  const handleConfirmSurrender = () => {
    const result = surrender();
    if (result.success) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-shake"
        style={{
          padding: '32px',
          maxWidth: '440px',
          width: '90%',
          border: '1px solid rgba(255, 0, 85, 0.4)',
          boxShadow: '0 0 30px rgba(255, 0, 85, 0.2)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '50%',
            background: 'rgba(255, 0, 85, 0.1)',
            marginBottom: '16px',
            color: 'var(--neon-red)',
          }}
        >
          <Flag size={32} />
        </div>

        <h3
          className="arcade-text"
          style={{ fontSize: '0.9rem', color: 'var(--neon-red)', marginBottom: '12px' }}
        >
          SURRENDER CHALLENGE?
        </h3>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          Giving up will forfeit all points for <strong>{challenge.title}</strong>, reset your current combo, and reveal the solution.
        </p>

        <div
          style={{
            background: 'rgba(255, 0, 85, 0.08)',
            border: '1px solid rgba(255, 0, 85, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
          }}
        >
          <AlertTriangle size={16} color="var(--neon-yellow)" />
          <span>Note: You can review the correct fix immediately upon surrendering.</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn-neon" onClick={onClose}>
            <span>Keep Fighting</span>
          </button>
          <button
            className="btn-neon btn-neon-red"
            onClick={handleConfirmSurrender}
          >
            <span>🏳️ Confirm Surrender</span>
          </button>
        </div>
      </div>
    </div>
  );
}
