import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AppData } from '../types';
import { fmt$ } from './format';

function addHeader(doc: jsPDF, logoDataUrl: string | null, corte: string) {
  const W = doc.internal.pageSize.getWidth();

  // Background header bar
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, 28, 'F');

  // Logo
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', 8, 4, 20, 20); } catch { /* skip */ }
  }

  // Title
  doc.setFontSize(9);
  doc.setTextColor(0, 212, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('INPer FINANZAS — Conciliación SICOP vs. INPer', 32, 11);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(`Base Maestra Corregida — Corte: ${corte}`, 32, 18);

  // Right: date
  const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${today}`, W - 8, 11, { align: 'right' });
}

function addFooter(doc: jsPDF, pageNum: number, total: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(10, 14, 26);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Instituto Nacional de Perinatología — Uso interno', 8, H - 3.5);
  doc.text(`Página ${pageNum} de ${total}`, W - 8, H - 3.5, { align: 'right' });
}

async function captureElement(el: HTMLElement): Promise<string | null> {
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#111827',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch { return null; }
}

async function loadLogoDataUrl(): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = '/logo.png';
  });
}

export async function generatePDF(data: AppData) {
  const { maestra, resumen } = data;

  const vinc      = maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');
  const falta     = maestra.filter(c => c.estatus === 'FALTA RECURSO');
  const sobra     = maestra.filter(c => c.estatus === 'SOBRA RECURSO');
  const equil     = maestra.filter(c => c.estatus === 'EQUILIBRADO');
  const pend      = maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP');
  const totalDisp  = vinc.reduce((s, c) => s + c.disponibleSICOP, 0);
  const totalEstim = vinc.reduce((s, c) => s + c.estimacionINPer, 0);
  const saldo      = totalDisp - totalEstim;
  const faltaSum   = falta.reduce((s, c) => s + c.saldo, 0);
  const sobraSum   = sobra.reduce((s, c) => s + c.saldo, 0);
  const pendEstim  = pend.reduce((s, c) => s + c.estimacionINPer, 0);
  const topFalta   = [...falta].sort((a, b) => a.saldo - b.saldo).slice(0, 10);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();   // 279
  const H = doc.internal.pageSize.getHeight();  // 216

  const logoDataUrl = await loadLogoDataUrl();

  // ── PAGE 1: Conclusión ejecutiva + KPIs ──────────────────────────────────
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, H, 'F');
  addHeader(doc, logoDataUrl, data.corte);

  let y = 34;

  // Conclusión banner
  const saldoNeg = saldo < 0;
  doc.setFillColor(17, 24, 39);
  doc.setDrawColor(saldoNeg ? 239 : 34, saldoNeg ? 68 : 197, saldoNeg ? 68 : 94);
  doc.setLineWidth(0.6);
  doc.roundedRect(8, y, W - 16, 36, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(240, 244, 248);
  doc.text('🎯 CONCLUSIÓN EJECUTIVA DE SUFICIENCIA PRESUPUESTAL (UNIVERSO CONCILIADO)', 14, y + 7);

  const badgeColor = saldoNeg ? [239, 68, 68] : [34, 197, 94];
  const badgeLabel = saldoNeg ? `FALTA RECURSO ${fmt$(Math.abs(saldo))}` : `SOBRA RECURSO ${fmt$(saldo)}`;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  const bW = doc.getTextWidth(badgeLabel) + 6;
  doc.roundedRect(W - 16 - bW, y + 3, bW, 7, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(badgeLabel, W - 16 - bW / 2, y + 7.8, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const col1x = 14, col2x = 90;
  doc.setTextColor(148, 163, 184);
  doc.text('Disponible SICOP Real (AT):', col1x, y + 16);
  doc.setTextColor(0, 212, 255); doc.setFont('helvetica', 'bold');
  doc.text(fmt$(totalDisp), col1x + 48, y + 16);

  doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
  doc.text('Estimación INPer Conciliado (AV):', col2x, y + 16);
  doc.setTextColor(168, 85, 247); doc.setFont('helvetica', 'bold');
  doc.text(fmt$(totalEstim), col2x + 58, y + 16);

  doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
  doc.text('Saldo Real de Suficiencia:', col1x, y + 23);
  doc.setTextColor(saldoNeg ? 239 : 34, saldoNeg ? 68 : 197, saldoNeg ? 68 : 94);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt$(saldo), col1x + 48, y + 23);

  doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
  doc.text(`Contratos Conciliados: ${vinc.length} | Pendientes: ${pend.length} | Exposición: ${fmt$(pendEstim)}`, col2x, y + 23);

  const nota = `${sobra.length} contratos con excedente (${fmt$(sobraSum, true)}), ${equil.length} equilibrados, ${falta.length} con insuficiencia (${fmt$(faltaSum, true)}).`;
  doc.setTextColor(100, 116, 139); doc.setFontSize(7);
  doc.text(nota, 14, y + 30, { maxWidth: W - 30 });

  y += 42;

  // KPI grid (2 rows × 4 cols)
  const kpis = [
    { label: 'Disponible SICOP Real', value: fmt$(totalDisp), sub: 'Universo Conciliado (AT)', color: [0, 212, 255] as [number,number,number] },
    { label: 'Estimación INPer', value: fmt$(totalEstim), sub: 'Universo Conciliado (AV)', color: [168, 85, 247] as [number,number,number] },
    { label: 'Saldo Real', value: fmt$(saldo), sub: saldoNeg ? 'FALTA RECURSO' : 'SOBRA RECURSO', color: (saldoNeg ? [239,68,68] : [34,197,94]) as [number,number,number] },
    { label: 'Universo Conciliado', value: String(vinc.length), sub: 'Compromisos conciliados', color: [59,130,246] as [number,number,number] },
    { label: 'Sobrante Acumulado', value: fmt$(sobraSum, true), sub: `${sobra.length} contratos con excedente`, color: [34,197,94] as [number,number,number] },
    { label: 'Faltante Acumulado', value: fmt$(faltaSum, true), sub: `${falta.length} contratos insuficientes`, color: [239,68,68] as [number,number,number] },
    { label: 'Pendientes SICOP', value: String(pend.length), sub: `Exposición: ${fmt$(pendEstim, true)}`, color: [245,158,11] as [number,number,number] },
    { label: 'Equilibrados', value: String(equil.length), sub: 'Contratos equilibrados', color: [148,163,184] as [number,number,number] },
  ];

  const cols = 4;
  const kW = (W - 16 - (cols - 1) * 4) / cols;
  const kH = 22;
  kpis.forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const kx = 8 + col * (kW + 4);
    const ky = y + row * (kH + 4);
    doc.setFillColor(17, 24, 39);
    doc.setDrawColor(k.color[0], k.color[1], k.color[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(kx, ky, kW, kH, 2, 2, 'FD');
    // left border accent
    doc.setFillColor(k.color[0], k.color[1], k.color[2]);
    doc.rect(kx, ky, 1.5, kH, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(k.label.toUpperCase(), kx + 5, ky + 6);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, kx + 5, ky + 14);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(k.sub, kx + 5, ky + 19.5);
  });

  addFooter(doc, 1, 3);

  // ── PAGE 2: Charts (captured from DOM) ──────────────────────────────────
  doc.addPage();
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, H, 'F');
  addHeader(doc, logoDataUrl, data.corte);

  y = 34;

  // Capture charts-grid div
  const chartsGrid = document.querySelector('.charts-grid') as HTMLElement | null;
  if (chartsGrid) {
    const imgData = await captureElement(chartsGrid);
    if (imgData) {
      const imgW = W - 16;
      const imgH = (chartsGrid.offsetHeight / chartsGrid.offsetWidth) * imgW;
      const maxH = H - y - 14;
      const finalH = Math.min(imgH, maxH);
      doc.addImage(imgData, 'PNG', 8, y, imgW, finalH);
      y += finalH + 6;
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('(Gráficas no disponibles — abrir el dashboard primero)', 8, y + 10);
    y += 18;
  }

  // Section label
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('DISTRIBUCIÓN POR ESTATUS DE SUFICIENCIA PRESUPUESTAL', 8, y + 4);

  addFooter(doc, 2, 3);

  // ── PAGE 3: Tablas resumen + Top faltantes ───────────────────────────────
  doc.addPage();
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, H, 'F');
  addHeader(doc, logoDataUrl, data.corte);

  y = 34;

  // Resumen table
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(148, 163, 184);
  doc.text('RESUMEN POR ESTATUS', 8, y);
  y += 5;

  const rHeaders = ['Estatus', 'Contratos', 'Disponible SICOP', 'Estimación INPer', 'Saldo'];
  const rColW = [70, 22, 46, 46, 46];
  const rX = [8, 80, 104, 152, 200];

  doc.setFillColor(17, 24, 39);
  doc.rect(8, y, W - 16, 7, 'F');
  rHeaders.forEach((h, i) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(h.toUpperCase(), rX[i] + (i > 0 ? rColW[i] - 1 : 2), y + 4.8, { align: i > 0 ? 'right' : 'left' });
  });
  y += 7;

  resumen.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? [15, 20, 32] : [17, 24, 39];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(8, y, W - 16, 7, 'F');

    const statusColor: [number, number, number] =
      r.estatus === 'SOBRA RECURSO' ? [34, 197, 94] :
      r.estatus === 'FALTA RECURSO' ? [239, 68, 68] :
      r.estatus === 'EQUILIBRADO'   ? [245, 158, 11] : [100, 116, 139];

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(r.estatus, rX[0] + 2, y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(240, 244, 248);
    doc.text(String(r.contratos), rX[1] + rColW[1] - 1, y + 4.8, { align: 'right' });
    doc.setTextColor(0, 212, 255);
    doc.text(r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? 'NO DETERMINADO' : fmt$(r.disponibleSICOP), rX[2] + rColW[2] - 1, y + 4.8, { align: 'right' });
    doc.setTextColor(168, 85, 247);
    doc.text(fmt$(r.estimacionINPer), rX[3] + rColW[3] - 1, y + 4.8, { align: 'right' });

    const sc: [number, number, number] = r.saldo < 0 ? [239, 68, 68] : r.saldo > 0 ? [34, 197, 94] : [245, 158, 11];
    doc.setTextColor(sc[0], sc[1], sc[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? '—' : fmt$(r.saldo), rX[4] + rColW[4] - 1, y + 4.8, { align: 'right' });

    y += 7;
  });

  y += 8;

  // Top faltantes table
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text(`TOP ${topFalta.length} — CONTRATOS CON MAYOR INSUFICIENCIA PRESUPUESTAL`, 8, y);
  y += 5;

  const fHeaders = ['No.', 'Contrato', 'Proveedor', 'Disponible SICOP', 'Estimación INPer', 'Saldo (Déficit)'];
  const fColW = [10, 38, 80, 42, 42, 42];
  const fX = [8, 18, 58, 140, 184, 226];

  doc.setFillColor(17, 24, 39);
  doc.rect(8, y, W - 16, 7, 'F');
  fHeaders.forEach((h, i) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(h.toUpperCase(), fX[i] + (i > 2 ? fColW[i] - 1 : 2), y + 4.8, { align: i > 2 ? 'right' : 'left' });
  });
  y += 7;

  topFalta.forEach((c, idx) => {
    if (y > H - 18) return;
    const bg = idx % 2 === 0 ? [15, 20, 32] : [17, 24, 39];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(8, y, W - 16, 7, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), fX[0] + 2, y + 4.8);

    doc.setTextColor(240, 244, 248);
    doc.text(c.contrato.substring(0, 20), fX[1] + 2, y + 4.8);

    doc.setTextColor(148, 163, 184);
    const prov = (c as { proveedor?: string }).proveedor ?? '—';
    doc.text(prov.substring(0, 35), fX[2] + 2, y + 4.8);

    doc.setTextColor(0, 212, 255);
    doc.text(fmt$(c.disponibleSICOP), fX[3] + fColW[3] - 1, y + 4.8, { align: 'right' });

    doc.setTextColor(168, 85, 247);
    doc.text(fmt$(c.estimacionINPer), fX[4] + fColW[4] - 1, y + 4.8, { align: 'right' });

    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt$(c.saldo), fX[5] + fColW[5] - 1, y + 4.8, { align: 'right' });

    y += 7;
  });

  addFooter(doc, 3, 3);

  const filename = `Reporte_Conciliacion_SICOP_INPer_${data.corte.replace(/\s/g, '_')}.pdf`;
  doc.save(filename);
}
