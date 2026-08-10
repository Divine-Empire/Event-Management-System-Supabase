import { jsPDF } from 'jspdf';

/**
 * Creates and renders the official Lucky Draw Pass ticket on a high-res Canvas (1200x700)
 */
export const generatePassCanvas = (participant, event) => {
  if (!participant || !event) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background Dark Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
  bgGrad.addColorStop(0, '#0f172a'); // slate-900
  bgGrad.addColorStop(0.5, '#1e1b4b'); // indigo-950
  bgGrad.addColorStop(1, '#020617'); // slate-950
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 700);

  // Outer Border (Gold accent)
  ctx.strokeStyle = '#f59e0b'; // amber-500
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, 1160, 660);

  // Inner Border (subtle line)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 1136, 636);

  // Top Header Banner Box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(32, 32, 1136, 120);

  // Sponsor / Header Text
  ctx.fillStyle = '#fbbf24'; // amber-400
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText((event.sponsor || 'DIVINE EMPIRE GLOBAL').toUpperCase(), 60, 72);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(event.name || 'Divine Lucky Draw Event', 60, 118);

  // Official Badge on top right
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(820, 60, 310, 48, 12);
  } else {
    ctx.rect(820, 60, 310, 48);
  }
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL ENTRY PASS', 975, 90);
  ctx.textAlign = 'left';

  // Divider Line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 180);
  ctx.lineTo(1140, 180);
  ctx.stroke();

  // Participant Info Column (Left side)
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('PARTICIPANT DETAILS', 60, 220);

  const drawLabelValue = (label, value, y) => {
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.font = 'normal 18px sans-serif';
    ctx.fillText(label, 60, y);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(String(value), 260, y);
  };

  drawLabelValue('Customer Name:', participant.customerName || participant.name || 'N/A', 270);
  drawLabelValue('Mobile Number:', participant.mobile || 'N/A', 325);
  drawLabelValue('Invoice Number:', `#${participant.invoiceNumber || participant.invoiceNo || 'N/A'}`, 380);
  drawLabelValue('Service Type:', participant.serviceType === 'TOTAL_STATION' ? 'Total Station Service' : 'NABL Calibration Service', 435);

  // Lucky Number Hero Badge Box (Right side)
  const boxGrad = ctx.createLinearGradient(700, 210, 1140, 480);
  boxGrad.addColorStop(0, '#581c87'); // purple-900
  boxGrad.addColorStop(1, '#312e81'); // indigo-900
  ctx.fillStyle = boxGrad;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(700, 210, 440, 270, 24);
  } else {
    ctx.rect(700, 210, 440, 270);
  }
  ctx.fill();
  ctx.strokeStyle = '#a855f7'; // purple-500
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#e9d5ff'; // purple-200
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHOSEN LUCKY NUMBER', 920, 280);

  // Large Number
  ctx.fillStyle = '#fde047'; // amber-300
  ctx.font = '900 96px monospace';
  ctx.fillText(`#${String(participant.luckyNumber || '000').padStart(3, '0')}`, 920, 395);
  ctx.textAlign = 'left';

  // Bottom Footer Bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(32, 550, 1136, 118);

  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Issued: ${new Date().toLocaleString()}`, 60, 595);
  ctx.fillText(`Ref ID: ${participant.id || 'N/A'}`, 60, 630);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'italic 13px sans-serif';
  ctx.fillText('Notice: This entry pass is official proof of registration & chosen lucky number for the live prize draw.', 480, 615);

  return canvas;
};

/**
 * Generates and downloads a high-res PNG Image Pass ticket for the participant
 */
export const downloadPassAsImage = (participant, event) => {
  const canvas = generatePassCanvas(participant, event);
  if (!canvas) return;

  const link = document.createElement('a');
  const invNo = String(participant.invoiceNumber || participant.invoiceNo || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
  link.download = `Lucky_Draw_Pass_${invNo}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

/**
 * Generates and downloads a 1:1 identical PDF Entry Pass document using jsPDF
 */
export const downloadPassAsPdf = (participant, event) => {
  const canvas = generatePassCanvas(participant, event);
  if (!canvas) return;

  const imgData = canvas.toDataURL('image/png');

  // Create PDF matching exact 1200:700 aspect ratio (210mm x 122.5mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [210, 122.5]
  });

  doc.addImage(imgData, 'PNG', 0, 0, 210, 122.5);

  const invNo = String(participant.invoiceNumber || participant.invoiceNo || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Lucky_Draw_Pass_${invNo}.pdf`);
};
