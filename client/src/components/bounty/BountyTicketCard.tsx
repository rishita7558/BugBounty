/**
 * @file BountyTicketCard.tsx
 * @description Standalone Bounty Ticket Card component with retro pixel styling and close control.
 * Features prominent [ESC / EXIT] / < BACK TO LOBBY button and global Escape key listener.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  downloadTicketAsPdf,
  downloadTicketAsImage,
  printTicketDirectly,
  type BountyTicketData,
} from '@/lib/ticketGenerator';
import { Printer, Download, Image as ImageIcon, Award, Check } from 'lucide-react';

export interface BountyTicketCardProps {
  /** Structured ticket payload. */
  data: BountyTicketData;
  /** Explicit callback to return to lobby / close card. */
  onClose?: () => void;
  /** Optional custom title. */
  title?: string;
}

export function BountyTicketCard({
  data,
  onClose,
  title = 'OFFICIAL BOUNTY VOUCHER',
}: BountyTicketCardProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleExit = useCallback(() => {
    if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
  }, [onClose]);

  // Global KeyboardEvent listener for the Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.code === 'Escape') {
        event.preventDefault();
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExit]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      await downloadTicketAsPdf(ticketRef.current, `bounty-ticket-${data.ticketId}.pdf`);
      showNotification('PDF Ticket downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      await downloadTicketAsImage(ticketRef.current, `bounty-ticket-${data.ticketId}.png`);
      showNotification('PNG Ticket saved successfully!');
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '28px',
        background: '#081426',
        border: '2px solid #00f0ff',
        boxShadow: '4px 4px 0px #003366',
        borderRadius: '0px',
        color: '#EAF8FF',
        fontFamily: 'var(--font-mono, monospace)',
        position: 'relative',
      }}
    >
      {/* Header bar with prominent [ESC / EXIT] retro pixel button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} color="#00f0ff" />
          <span
            style={{
              fontSize: '0.8rem',
              color: '#00f0ff',
              fontFamily: 'var(--font-arcade, monospace)',
              letterSpacing: '1px',
              textShadow: '0 0 8px rgba(0, 240, 255, 0.5)',
            }}
          >
            {title}
          </span>
        </div>

        {/* Retro Pixel Close/Escape Button */}
        <button
          onClick={handleExit}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            border: '2px solid #00f0ff',
            boxShadow: isHovered ? 'none' : '2px 2px 0px #003366',
            borderRadius: '0px',
            background: isHovered ? '#00f0ff' : '#0a1128',
            color: isHovered ? '#0a1128' : '#00f0ff',
            padding: '6px 14px',
            fontSize: '0.75rem',
            fontWeight: 800,
            fontFamily: 'var(--font-arcade, monospace)',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
          title="Press Escape or click to exit to lobby"
        >
          [ESC / EXIT]
        </button>
      </div>

      {/* Printable Ticket Area */}
      <div
        ref={ticketRef}
        style={{
          background: 'linear-gradient(135deg, #050b18 0%, #0a1128 100%)',
          border: '2px dashed #00f0ff',
          padding: '24px',
          position: 'relative',
          color: '#eaf8ff',
          boxShadow: 'inset 0 0 20px rgba(0, 240, 255, 0.15)',
          borderRadius: '0px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '0.65rem', letterSpacing: '3px', color: '#00f0ff', textTransform: 'uppercase' }}>
            ★ CODEDUEL: ICE MATRIX ARENA ★
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#eaf8ff', margin: '4px 0' }}>
            CERTIFIED BOUNTY REDEMPTION
          </div>
          <div style={{ fontSize: '0.7rem', color: '#8199b5' }}>
            SERIAL ID: #{data.ticketId}
          </div>
        </div>

        {/* Ticket Body Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8199b5' }}>OPERATOR / CALLSIGN</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00f0ff' }}>{data.callsign}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8199b5' }}>DIFFICULTY TIER</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#65cfff' }}>
              {data.difficulty.toUpperCase()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8199b5' }}>VULNERABILITY RESOLVED</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eaf8ff' }}>{data.challengeTitle}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#8199b5' }}>BOUNTY VALUE</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00f0ff' }}>
              +{data.bountyPoints} PTS
            </div>
          </div>
        </div>

        {/* Execution Specs */}
        <div
          style={{
            background: '#050b18',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            color: '#8199b5',
            borderRadius: '0px',
          }}
        >
          <span>Time: {data.timeSpentSeconds}s</span>
          <span>Combo: x{data.comboMultiplier.toFixed(2)}</span>
          <span>{data.solvedAt}</span>
        </div>

        {/* Barcode Stamp */}
        <div style={{ textAlign: 'center', opacity: 0.85 }}>
          <div
            style={{
              height: '32px',
              background: 'repeating-linear-gradient(90deg, #00f0ff, #00f0ff 2px, transparent 2px, transparent 4px, #00f0ff 4px, #00f0ff 8px, transparent 8px, transparent 10px)',
              margin: '0 auto 6px auto',
              maxWidth: '280px',
            }}
          />
          <div style={{ fontSize: '0.55rem', letterSpacing: '4px', color: '#00f0ff' }}>
            *{data.ticketId}*
          </div>
        </div>
      </div>

      {/* Export Action Bar */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          style={{
            border: '2px solid #00f0ff',
            boxShadow: '2px 2px 0px #003366',
            borderRadius: '0px',
            background: '#0a1128',
            color: '#00f0ff',
            padding: '8px 14px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-arcade, monospace)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Download size={14} /> PDF
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={downloading}
          style={{
            border: '2px solid #65cfff',
            boxShadow: '2px 2px 0px #003366',
            borderRadius: '0px',
            background: '#0a1128',
            color: '#65cfff',
            padding: '8px 14px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-arcade, monospace)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ImageIcon size={14} /> PNG
        </button>

        <button
          onClick={() => printTicketDirectly()}
          style={{
            border: '2px solid #00f0ff',
            boxShadow: '2px 2px 0px #003366',
            borderRadius: '0px',
            background: '#00f0ff',
            color: '#0a1128',
            padding: '8px 16px',
            fontSize: '0.75rem',
            fontWeight: 800,
            fontFamily: 'var(--font-arcade, monospace)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Printer size={14} /> PRINT
        </button>
      </div>

      {toast && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(57, 255, 20, 0.15)',
            border: '1px solid #39ff14',
            borderRadius: '0px',
            color: '#39ff14',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Check size={14} /> {toast}
        </div>
      )}
    </div>
  );
}

