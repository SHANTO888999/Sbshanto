import { jsPDF } from 'jspdf';
import type { PortfolioContentBundle } from '../data/contentSchema';
import { computeAccentPalette } from './themeAccent';

function buildSafePdfFilename(displayName: string): string {
  const clean = displayName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return `${clean || 'SHANTO'}-Resume.pdf`;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
    const mime = mimeMatch?.[1] || 'application/pdf';
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function triggerUrlDownload(url: string, filename: string): void {
  if (url.startsWith('data:')) {
    const blob = dataUrlToBlob(url);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      return;
    }
  }

  const a = document.createElement('a');
  a.href = url;
  if (url.startsWith('data:')) {
    a.download = filename;
  } else {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function generatePortfolioCvPdf(bundle: PortfolioContentBundle): void {
  const { profile, cvSettings, heroMetrics, techStack, experience, projects, milestones, viewerControls } =
    bundle;
  const accent = computeAccentPalette(viewerControls.accentColor);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 48;
      doc.setDrawColor(accent.r, accent.g, accent.b);
      doc.setLineWidth(2);
      doc.line(marginX, 28, pageWidth - marginX, 28);
    }
  };

  // Dark editorial header banner
  doc.setFillColor(12, 13, 18);
  doc.rect(0, 0, pageWidth, 138, 'F');

  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, 134, pageWidth, 4, 'F');

  const cleanName = profile.displayName.replace(/\.+$/, '') || 'SHANTO';
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(cleanName, marginX, 48, { maxWidth: contentWidth });

  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(profile.role.toUpperCase(), marginX, 66, { maxWidth: contentWidth });

  doc.setTextColor(200, 204, 214);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(cvSettings.headline || profile.disciplineSummary, marginX, 83, {
    maxWidth: contentWidth,
  });

  const contactLine = [
    profile.email,
    profile.phoneNumber || (profile.whatsappNumber ? `WhatsApp: ${profile.whatsappNumber}` : ''),
    profile.location,
    profile.githubHandle,
    'sbshanto.web.app',
  ]
    .filter(Boolean)
    .join('   •   ');
  doc.setTextColor(161, 161, 170);
  doc.setFontSize(8.5);
  doc.text(contactLine, marginX, 114, { maxWidth: contentWidth });

  y = 166;

  const drawSectionHeading = (title: string) => {
    ensureSpace(36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.text(title.toUpperCase(), marginX, y);
    doc.setDrawColor(225, 228, 232);
    doc.setLineWidth(0.75);
    doc.line(marginX, y + 5, pageWidth - marginX, y + 5);
    y += 20;
  };

  // Profile Summary
  drawSectionHeading('Executive Summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(39, 39, 42);
  const bioLines = doc.splitTextToSize(profile.bio, contentWidth) as string[];
  ensureSpace(bioLines.length * 14 + 8);
  doc.text(bioLines, marginX, y);
  y += bioLines.length * 14 + 8;

  // Metrics strip
  if (heroMetrics.length > 0) {
    const colW = contentWidth / Math.min(4, heroMetrics.length);
    ensureSpace(44);
    heroMetrics.slice(0, 4).forEach((m, idx) => {
      const cx = marginX + idx * colW;
      doc.setFillColor(246, 247, 249);
      doc.roundedRect(cx, y, colW - 8, 36, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(24, 24, 27);
      doc.text(m.value, cx + 8, y + 15, { maxWidth: colW - 18 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(82, 82, 91);
      doc.text(m.label, cx + 8, y + 28, { maxWidth: colW - 18 });
    });
    y += 54;
  }

  // Experience
  if (experience.length > 0) {
    drawSectionHeading('Experience & Studio Roles');
    experience.slice(0, 8).forEach((exp) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const periodWidth = doc.getTextWidth(exp.period);
      const leftMaxW = Math.max(180, contentWidth - periodWidth - 16);

      doc.setFontSize(10.5);
      const titleLines = doc.splitTextToSize(`${exp.role} — ${exp.org}`, leftMaxW) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const descLines = doc.splitTextToSize(exp.description, contentWidth) as string[];

      ensureSpace(titleLines.length * 13 + descLines.length * 13 + 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text(titleLines, marginX, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text(exp.period, pageWidth - marginX, y, { align: 'right' });

      y += titleLines.length * 13 + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(63, 63, 70);
      doc.text(descLines, marginX, y);
      y += descLines.length * 13 + 10;
    });
  }

  // Skills & Core Stack
  if (techStack.length > 0) {
    drawSectionHeading('Technical Stack & Capabilities');
    const colW = contentWidth / 2;
    for (let i = 0; i < techStack.length; i += 2) {
      ensureSpace(28);
      const left = techStack[i];
      const right = techStack[i + 1];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`• ${left.name}`, marginX, y, { maxWidth: colW - 12 });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text(left.role, marginX + 10, y + 11, { maxWidth: colW - 18 });

      if (right) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(24, 24, 27);
        doc.text(`• ${right.name}`, marginX + colW, y, { maxWidth: colW - 12 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text(right.role, marginX + colW + 10, y + 11, { maxWidth: colW - 18 });
      }
      y += 28;
    }
    y += 4;
  }

  // Selected Shipped Projects
  if (projects.length > 0) {
    drawSectionHeading('Selected Shipped Builds');
    projects.slice(0, 6).forEach((proj) => {
      const stackText = proj.stack.slice(0, 4).join(' · ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const stackW = Math.min(contentWidth * 0.42, doc.getTextWidth(stackText));
      const titleMaxW = Math.max(160, contentWidth - stackW - 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const titleLines = doc.splitTextToSize(
        `${proj.title} (${proj.category} · ${proj.year})`,
        titleMaxW
      ) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const sumLines = doc.splitTextToSize(proj.summary, contentWidth) as string[];

      ensureSpace(titleLines.length * 13 + sumLines.length * 12 + 16);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(titleLines, marginX, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text(stackText, pageWidth - marginX, y, { align: 'right', maxWidth: contentWidth * 0.42 });

      y += titleLines.length * 13 + 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(63, 63, 70);
      doc.text(sumLines, marginX, y);
      y += sumLines.length * 12 + 9;
    });
  }

  // Milestones
  if (milestones.length > 0) {
    drawSectionHeading('Key Milestones & Impact');
    milestones.slice(0, 5).forEach((ms) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const headingLines = doc.splitTextToSize(`• ${ms.title} (${ms.year})`, contentWidth) as string[];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const outLines = doc.splitTextToSize(
        `${ms.context} — ${ms.outcome}`,
        contentWidth - 10
      ) as string[];

      ensureSpace(headingLines.length * 12 + outLines.length * 11 + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(24, 24, 27);
      doc.text(headingLines, marginX, y);
      y += headingLines.length * 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text(outLines, marginX + 10, y);
      y += outLines.length * 11 + 6;
    });
  }

  doc.save(buildSafePdfFilename(profile.displayName));
}

export function downloadPortfolioCv(bundle: PortfolioContentBundle): void {
  const customUrl = bundle.cvSettings.customUrl?.trim();
  if (bundle.cvSettings.mode === 'custom' && customUrl) {
    triggerUrlDownload(customUrl, buildSafePdfFilename(bundle.profile.displayName));
    return;
  }
  generatePortfolioCvPdf(bundle);
}
