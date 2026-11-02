/**
 * @file ArcadeTicketModal.tsx
 * @description Modal dialog presenting a printable retro arcade bounty ticket — ICE MATRIX edition.
 * Renders ticket data including challenge metadata, operator callsign, score breakdown,
 * and barcode styling, with PDF, PNG, and direct browser print export capabilities.
 */

import { useRef, useState } from 'react';
import {
  downloadTicketAsPdf,
  downloadTicketAsImage,
  printTicketDirectly,
  type BountyTicketData,
} from '@/lib/ticketGenerator';
import { Printer, Download, Image as ImageIcon, X, Check, Award } from 'lucide-react';

/**
 * Properties accepted by the ArcadeTicketModal component.
 */
export interface ArcadeTicketModalProps {
  /** Whether the modal dialog is currently visible. */
  open: boolean;
  /** Callback fired when the player closes the modal. */
  onClose: () => void;
  /** Structured ticket data containing score, operator, and challenge details. */
  data: BountyTicketData;
}

/**
 * ArcadeTicketModal component for generating and downloading celebratory physical tickets.
 *
 * @param props Component properties.
 * @returns Rendered modal overlay or null if closed.
 */
export function ArcadeTicketModal({ open, onClose, data }: ArcadeTicketModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!open) return null;

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
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 11, 24, 0.88)',
        backdropFilter: 'blur(12px)',
        padding: '20px',
      }}
    >
      <div
        className="pixel-box hud-corner-brackets"
        style={{
          maxWidth: '540px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '28px',
          background: 'rgba(8, 20, 38, 0.95)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          boxShadow: '0 24px 60px rgba(5, 11, 24, 0.9), 0 0 35px rgba(0, 217, 255, 0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#00D9FF" />
            <span className="arcade-text neon-text" style={{ fontSize: '0.75rem' }}>
              OFFICIAL BOUNTY VOUCHER
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8199B5',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div
          ref={ticketRef}
          className="printable-ticket"
          style={{
            background: 'linear-gradient(135deg, #050B18 0%, #081426 100%)',
            border: '2px dashed #00D9FF',
            padding: '24px',
            position: 'relative',
            color: '#EAF8FF',
            fontFamily: 'var(--font-mono)',
            boxShadow: 'inset 0 0 20px rgba(0, 217, 255, 0.1)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* Top Notch Stamp */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '1px solid rgba(0, 217, 255, 0.25)',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.65rem', letterSpacing: '3px', color: '#00D9FF', textTransform: 'uppercase' }}>
              ★ CODEDUEL: ICE MATRIX ARENA ★
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EAF8FF', margin: '4px 0' }}>
              CERTIFIED BOUNTY REDEMPTION
            </div>
            <div style={{ fontSize: '0.7rem', color: '#8199B5' }}>
              SERIAL ID: #{data.ticketId}
            </div>
          </div>

          {/* Ticket Body Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8199B5' }}>OPERATOR / CALLSIGN</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00D9FF' }}>{data.callsign}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8199B5' }}>DIFFICULTY TIER</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#65CFFF' }}>
                {data.difficulty.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8199B5' }}>VULNERABILITY RESOLVED</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EAF8FF' }}>{data.challengeTitle}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#8199B5' }}>BOUNTY VALUE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00D9FF' }}>
                +{data.bountyPoints} PTS
              </div>
            </div>
          </div>

          {/* Execution Specs */}
          <div
            style={{
              background: '#050B18',
              border: '1px solid rgba(0, 217, 255, 0.2)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#8199B5',
            }}
          >
            <span>Time Elapsed: {data.timeSpentSeconds}s</span>
            <span>Combo: x{data.comboMultiplier.toFixed(2)}</span>
            <span>{data.solvedAt}</span>
          </div>

          {/* Barcode Mock */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                letterSpacing: '4px',
                fontFamily: 'monospace',
                fontSize: '1.2rem',
                color: '#00D9FF',
                opacity: 0.8,
              }}
            >
              ||| | |||| | ||| |||| | | |||
            </div>
            <div style={{ fontSize: '0.6rem', color: '#8199B5', marginTop: '4px' }}>
              SEC-HASH: {data.ticketId}-ICE-MATRIX-VERIFIED
            </div>
          </div>
        </div>

        {/* Feedback Toast */}
        {toast && (
          <div
            className="pixel-box"
            style={{
              padding: '8px 12px',
              background: 'rgba(0, 217, 255, 0.12)',
              border: '1px solid #00D9FF',
              color: '#00D9FF',
              fontSize: '0.75rem',
              textAlign: 'center',
            }}
          >
            <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />
            {toast}
          </div>
        )}

        {/* Export Action Controls */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-pixel-cyber"
            onClick={() => printTicketDirectly()}
          >
            <Printer size={14} color="#00D9FF" /> Print
          </button>
          <button
            className="btn-pixel-cyber"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            <Download size={14} color="#65CFFF" /> PDF
          </button>
          <button
            className="btn-pixel-primary"
            onClick={handleDownloadImage}
            disabled={downloading}
          >
            <ImageIcon size={14} /> PNG Image
          </button>
        </div>
      </div>
    </div>
  );
}
