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

function triggerUrlDownload(url: string, filename: string): void {
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
  doc.text(cleanName, marginX, 48);

  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(profile.role.toUpperCase(), marginX, 66);

  doc.setTextColor(200, 204, 214);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(cvSettings.headline || profile.disciplineSummary, marginX, 83, {
    maxWidth: contentWidth,
  });

  const contactLine = [
    profile.email,
    profile.githubHandle,
    profile.availability,
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
      doc.text(m.value, cx + 8, y + 15);
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
      const descLines = doc.splitTextToSize(exp.description, contentWidth) as string[];
      ensureSpace(34 + descLines.length * 13);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`${exp.role} — ${exp.org}`, marginX, y);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text(exp.period, pageWidth - marginX, y, { align: 'right' });

      y += 14;
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
      ensureSpace(24);
      const left = techStack[i];
      const right = techStack[i + 1];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`• ${left.name}`, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text(left.role, marginX + 10, y + 11, { maxWidth: colW - 16 });

      if (right) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(24, 24, 27);
        doc.text(`• ${right.name}`, marginX + colW, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(82, 82, 91);
        doc.text(right.role, marginX + colW + 10, y + 11, { maxWidth: colW - 16 });
      }
      y += 28;
    }
    y += 4;
  }

  // Selected Shipped Projects
  if (projects.length > 0) {
    drawSectionHeading('Selected Shipped Builds');
    projects.slice(0, 6).forEach((proj) => {
      const sumLines = doc.splitTextToSize(proj.summary, contentWidth) as string[];
      ensureSpace(34 + sumLines.length * 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(24, 24, 27);
      doc.text(`${proj.title} (${proj.category} · ${proj.year})`, marginX, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(accent.r, accent.g, accent.b);
      doc.text(proj.stack.slice(0, 4).join(' · '), pageWidth - marginX, y, { align: 'right' });

      y += 13;
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
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`• ${ms.title} (${ms.year})`, marginX, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      const outLines = doc.splitTextToSize(`${ms.context} — ${ms.outcome}`, contentWidth - 10) as string[];
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
