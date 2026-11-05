/**
 * @file EmptyBountiesState.tsx
 * @description Pixel-art empty state component presented when no bounties have been attempted yet.
 */

import React from 'react';
import { ShieldAlert, Terminal, Zap } from 'lucide-react';

export interface EmptyBountiesStateProps {
  onStartBounty?: () => void;
  message?: string;
  subtitle?: string;
}

export const EmptyBountiesState: React.FC<EmptyBountiesStateProps> = ({
  onStartBounty,
  message = 'NO BOUNTIES ATTEMPTED YET',
  subtitle = 'Zero-Database career ledger is ready. Launch a debugging bounty to log your first verified zero-day remediation!',
}) => {
  return (
    <div
      className="pixel-box hud-corner-brackets"
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        background: 'rgba(5, 11, 24, 0.75)',
        border: '1px dashed rgba(0, 217, 255, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          padding: '14px',
          background: 'rgba(0, 217, 255, 0.08)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          color: '#00D9FF',
        }}
        className="pixel-box"
      >
        <Terminal size={32} />
      </div>

      <div>
        <div
          className="arcade-text"
          style={{
            fontSize: '0.95rem',
            color: '#00D9FF',
            letterSpacing: '1px',
            marginBottom: '6px',
          }}
        >
          {message}
        </div>
        <p
          style={{
            color: '#8199B5',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            maxWidth: '420px',
            margin: '0 auto',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {subtitle}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.7rem',
          color: '#8199B5',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <ShieldAlert size={14} color="#00D9FF" />
        <span>IndexedDB: 0 Solved Records • Career Score: 0 PTS</span>
      </div>

      {onStartBounty && (
        <button
          className="btn-pixel-primary"
          onClick={onStartBounty}
          style={{
            marginTop: '8px',
            padding: '8px 18px',
            fontSize: '0.75rem',
          }}
        >
          <Zap size={13} /> LAUNCH ARENA BOUNTY
        </button>
      )}
    </div>
  );
};

