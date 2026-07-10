import PDFDocument from 'pdfkit';

const BLUE = '#145AE2';
const DARK = '#111518';
const GRAY = '#757575';
const BORDER = '#e1e8ed';
const BG = '#f2f5f7';
const MARGIN = 48;

const inr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

/**
 * Branded one-page "Scheme Registration" summary attached to the registration email.
 * Details only (no photos), styled after the printable scheme report.
 */
export function buildRegistrationPdf(registration) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const snap = registration.schemeSnapshot;
    const contentWidth = doc.page.width - MARGIN * 2;
    let y = MARGIN;

    /* ---------- header (logo block left, document title right, thick brand rule) ---------- */
    doc.font('Helvetica-Bold').fontSize(24).fillColor(BLUE).text('PURO SOUL', MARGIN, y);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(GRAY)
      .text('Where Purity Lives in Every Drop', MARGIN, y + 28);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .text('AMARJIT FISCAL VENTURES PVT. LTD.', MARGIN, y + 41, { characterSpacing: 1 });

    doc.font('Helvetica-Bold').fontSize(16).fillColor(BLUE).text('Scheme Registration', MARGIN, y + 2, {
      width: contentWidth,
      align: 'right',
    });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GRAY)
      .text(`Generated on ${dateTime.format(new Date())}`, MARGIN, y + 24, { width: contentWidth, align: 'right' })
      .text('Status: Active', MARGIN, y + 37, { width: contentWidth, align: 'right' });

    y += 60;
    doc.rect(MARGIN, y, contentWidth, 3).fill(BLUE);
    y += 24;

    /* ---------- helpers ---------- */
    const section = (title) => {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BLUE).text(title.toUpperCase(), MARGIN, y, {
        characterSpacing: 0.8,
      });
      y += 15;
      doc
        .moveTo(MARGIN, y)
        .lineTo(doc.page.width - MARGIN, y)
        .lineWidth(1.2)
        .strokeColor(BLUE)
        .stroke();
      y += 12;
    };

    /* 3-column label-over-value grid, like the report's info grid */
    const grid = (items, cols = 3) => {
      const colW = contentWidth / cols;
      items.forEach((item, i) => {
        const cx = MARGIN + (i % cols) * colW;
        const cy = y + Math.floor(i / cols) * 36;
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(item[0].toUpperCase(), cx, cy, {
          width: colW - 12,
          characterSpacing: 0.5,
        });
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(DARK)
          .text(String(item[1] ?? '—'), cx, cy + 12, { width: colW - 12, height: 14, ellipsis: true });
      });
      y += Math.ceil(items.length / cols) * 36 + 6;
    };

    /* row of bordered stat boxes, like the report's progress tiles */
    const statBoxes = (items) => {
      const gap = 10;
      const w = (contentWidth - gap * (items.length - 1)) / items.length;
      items.forEach((item, i) => {
        const x = MARGIN + i * (w + gap);
        doc.roundedRect(x, y, w, 48, 6).lineWidth(1).strokeColor(BORDER).stroke();
        doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(item[0].toUpperCase(), x, y + 10, {
          width: w,
          align: 'center',
          characterSpacing: 0.5,
        });
        doc
          .font('Helvetica-Bold')
          .fontSize(12.5)
          .fillColor(BLUE)
          .text(String(item[1]), x, y + 24, { width: w, align: 'center' });
      });
      y += 48 + 18;
    };

    /* ---------- party details ---------- */
    section('Party Details');
    grid([
      ['Party Name', registration.partyName],
      ['Registration Date', dateOnly.format(new Date(registration.registrationDate))],
      ['Created By', registration.createdBy?.name || '—'],
    ]);
    y += 4;

    /* ---------- scheme details ---------- */
    section('Scheme Details');
    grid([
      ['Scheme', snap.name],
      ['Activation Date', dateTime.format(new Date(registration.activationDate))],
      ['Expiry Date', dateOnly.format(new Date(registration.expiryDate))],
    ]);
    statBoxes([
      ['Advance Payment', inr(snap.advanceAmount)],
      ['Sales Target', `${num(snap.targetCases)} cases`],
      ['Benefit Per Case', inr(snap.benefitPerCase)],
      ['Validity', `${snap.validityDays} days`],
    ]);

    /* ---------- payment details (highlight bar, like the report's benefit box) ---------- */
    section('Payment Details');
    const boxH = 56;
    doc.roundedRect(MARGIN, y, contentWidth, boxH, 6).fill(BG);
    const colW = contentWidth / 3;
    const payItems = [
      ['Payment Mode', registration.paymentMode, DARK, 11],
      ['UTR / Reference No.', registration.utrNumber || '—', DARK, 11],
      ['Advance Paid', inr(registration.advanceAmount), BLUE, 14],
    ];
    payItems.forEach((item, i) => {
      const x = MARGIN + 16 + i * colW;
      doc.font('Helvetica').fontSize(7.5).fillColor(GRAY).text(item[0].toUpperCase(), x, y + 12, {
        width: colW - 24,
        characterSpacing: 0.5,
      });
      doc
        .font('Helvetica-Bold')
        .fontSize(item[3])
        .fillColor(item[2])
        .text(String(item[1]), x, y + 26, { width: colW - 24, height: 18, ellipsis: true });
    });
    y += boxH + 10;
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(GRAY)
      .text('The payment attachment is on record and can be viewed in the Scheme Tracker.', MARGIN, y);

    /* ---------- footer ---------- */
    doc
      .moveTo(MARGIN, doc.page.height - 70)
      .lineTo(doc.page.width - MARGIN, doc.page.height - 70)
      .lineWidth(0.8)
      .strokeColor(BORDER)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(GRAY)
      .text(
        'This is a system generated document from the Puro Soul Scheme Tracker · purosoul.in',
        MARGIN,
        doc.page.height - 60,
        { width: contentWidth, align: 'center' }
      );

    doc.end();
  });
}
