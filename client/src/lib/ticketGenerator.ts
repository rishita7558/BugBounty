import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ---------------------------------------------------------------------------
// Printable Retro Arcade Ticket Generator
// Serializes celebratory victory DOM elements into high-res PDF or PNG tickets
// using html2canvas and jsPDF.
// ---------------------------------------------------------------------------

export interface BountyTicketData {
  ticketId: string;
  callsign: string;
  challengeTitle: string;
  difficulty: string;
  bountyPoints: number;
  comboMultiplier: number;
  timeSpentSeconds: number;
  solvedAt: string;
}

/**
 * Generate a printable PDF arcade bounty ticket from an HTML element.
 */
export async function downloadTicketAsPdf(
  element: HTMLElement,
  filename = 'codeduel-bounty-ticket.pdf'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#0a0a16',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const widthMm = Math.min(210, Math.max(100, canvas.width * 0.264583));
  const heightMm = (canvas.height / canvas.width) * widthMm;

  const pdf = new jsPDF({
    orientation: heightMm > widthMm ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [widthMm, heightMm],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
  pdf.save(filename);
}

/**
 * Export high-resolution PNG image of the arcade ticket.
 */
export async function downloadTicketAsImage(
  element: HTMLElement,
  filename = 'codeduel-bounty-ticket.png'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#0a0a16',
    useCORS: true,
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Trigger standard browser print dialog for physical printer ticket output.
 */
export function printTicketDirectly(): void {
  window.print();
}
