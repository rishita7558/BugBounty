/**
 * @file ticketGenerator.ts
 * @description Document rasterization and ticket export utility using html2canvas and jsPDF.
 * Serializes celebratory victory DOM elements into high-resolution printable PDF vouchers,
 * PNG image assets, or physical browser print streams.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Metadata parameters rendered onto the printable arcade ticket voucher.
 */
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
 * Generates and triggers the download of a printable PDF arcade bounty ticket from a DOM element.
 *
 * @param element The container HTML element to rasterize.
 * @param filename File name for the downloaded PDF asset.
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
 * Exports a high-resolution PNG image asset of the rendered ticket element.
 *
 * @param element The container HTML element to rasterize.
 * @param filename File name for the downloaded PNG image.
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
 * Triggers the browser print dialog to print the active ticket directly.
 */
export function printTicketDirectly(): void {
  window.print();
}
