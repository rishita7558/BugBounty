/**
 * @file SurrenderModal.tsx
 * @description Confirmation modal dialog for surrendering the active debugging challenge — ICE MATRIX edition.
 * Confirms forfeiture, resets active combo multiplier, and transitions game state to defeat.
 */

import { useGameStore } from '@/store/useGameStore';
import { Flag, AlertTriangle } from 'lucide-react';
import { PixelCloseButton } from '@/components/common/PixelCloseButton';
import { useEffect } from 'react';

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-box hud-corner-brackets animate-screen-shake"
        style={{
          padding: '32px',
          maxWidth: '460px',
          width: '90%',
          background: 'rgba(8, 20, 38, 0.95)',
          border: '1px solid rgba(255, 59, 105, 0.45)',
          boxShadow: '0 20px 50px rgba(5, 11, 24, 0.9), 0 0 30px rgba(255, 59, 105, 0.2)',
          textAlign: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <PixelCloseButton onClick={onClose} title="Cancel (Esc)" />
        </div>
        <div
          style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'rgba(255, 59, 105, 0.1)',
            border: '1px solid rgba(255, 59, 105, 0.4)',
            marginBottom: '16px',
            color: '#FF3B69',
          }}
          className="pixel-box"
        >
          <Flag size={28} />
        </div>

        <div className="pixel-status-badge" style={{ marginBottom: '10px', color: '#FF3B69', borderColor: 'rgba(255, 59, 105, 0.4)' }}>
          WARNING • FORFEIT PROTOCOL
        </div>

        <h3
          className="arcade-text"
          style={{ fontSize: '0.95rem', color: '#FF3B69', marginBottom: '12px' }}
        >
          SURRENDER CHALLENGE?
        </h3>

        <p
          style={{
            color: '#8199B5',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            marginBottom: '20px',
          }}
        >
          Giving up will forfeit all bounty points for <strong>{challenge.title}</strong>, reset your current combo multiplier, and reveal the solution.
        </p>

        <div
          style={{
            background: '#050B18',
            border: '1px solid rgba(255, 59, 105, 0.3)',
            padding: '10px 14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#8199B5',
            fontFamily: 'var(--font-mono)',
            textAlign: 'left',
          }}
        >
          <AlertTriangle size={16} color="#FF3B69" />
          <span>Active combo and daily streak records will be impacted.</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn-pixel-cyber"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-pixel-cyber"
            onClick={handleConfirmSurrender}
            style={{
              borderColor: '#FF3B69',
              color: '#FF3B69',
              background: 'rgba(255, 59, 105, 0.15)',
            }}
          >
            Confirm Forfeit
          </button>
        </div>
      </div>
    </div>
  );
}
