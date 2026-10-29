import { useRef, useState } from 'react';
import { downloadTicketAsPdf, downloadTicketAsImage, printTicketDirectly, type BountyTicketData } from '@/lib/ticketGenerator';
import { Printer, Download, Image as ImageIcon, X, Check, Award } from 'lucide-react';

interface ArcadeTicketModalProps {
  open: boolean;
  onClose: () => void;
  data: BountyTicketData;
}

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
        background: 'rgba(5, 5, 12, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: '520px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px',
          border: '1px solid var(--border-neon)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="var(--neon-yellow)" />
            <span className="arcade-text" style={{ fontSize: '0.75rem', color: 'var(--neon-yellow)' }}>
              OFFICIAL BOUNTY TICKET
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
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
          style={{
            background: 'linear-gradient(135deg, #0d0e1c 0%, #15162b 100%)',
            border: '2px dashed #00f0ff',
            borderRadius: '12px',
            padding: '24px',
            position: 'relative',
            color: '#f0f0ff',
            fontFamily: 'var(--font-mono)',
            boxShadow: 'inset 0 0 20px rgba(0, 240, 255, 0.1)',
          }}
        >
          {/* Top Notch Stamp */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '1px solid rgba(0, 240, 255, 0.3)',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '0.65rem', letterSpacing: '3px', color: '#00f0ff', textTransform: 'uppercase' }}>
              ★ CODEDUEL: BUGBOUNTY ARENA ★
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffe600', margin: '4px 0' }}>
              CERTIFIED BOUNTY REDEMPTION
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9090b0' }}>
              SERIAL ID: #{data.ticketId}
            </div>
          </div>

          {/* Ticket Body Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#707090' }}>OPERATOR / CALLSIGN</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#39ff14' }}>{data.callsign}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#707090' }}>DIFFICULTY TIER</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff0055' }}>
                {data.difficulty.toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#707090' }}>VULNERABILITY RESOLVED</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>{data.challengeTitle}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#707090' }}>BOUNTY VALUE</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00f0ff' }}>
                +{data.bountyPoints} PTS
              </div>
            </div>
          </div>

          {/* Execution Specs */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#a0a0c0',
            }}
          >
            <span>Time Elapsed: {data.timeSpentSeconds}s</span>
            <span>Combo Multiplier: x{data.comboMultiplier.toFixed(2)}</span>
            <span>{data.solvedAt}</span>
          </div>

          {/* Barcode graphic */}
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <div
              style={{
                height: '32px',
                background:
                  'repeating-linear-gradient(90deg, #fff 0px, #fff 2px, transparent 2px, transparent 5px, #fff 5px, #fff 9px, transparent 9px, transparent 11px, #fff 11px, #fff 16px)',
                opacity: 0.85,
                margin: '0 auto 6px auto',
                maxWidth: '280px',
              }}
            />
            <div style={{ fontSize: '0.6rem', letterSpacing: '4px', color: '#707090' }}>
              * 100% CLIENT-PERSISTED • ZERO SERVER FOOTPRINT *
            </div>
          </div>
        </div>

        {/* Notification toast */}
        {toast && (
          <div
            style={{
              background: 'rgba(57, 255, 20, 0.15)',
              border: '1px solid var(--neon-green)',
              color: 'var(--neon-green)',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Check size={14} /> {toast}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn-neon btn-neon-green"
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} /> {downloading ? 'Rendering...' : 'Download PDF'}
            </span>
          </button>

          <button
            className="btn-neon"
            onClick={handleDownloadImage}
            disabled={downloading}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={14} /> PNG Image
            </span>
          </button>

          <button
            className="btn-neon"
            onClick={printTicketDirectly}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} /> Print
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
