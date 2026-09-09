import type { ContratoMaestro, INPerRow, PCOMRow, ResumenEstatus, Estatus } from '../types';

const TOLERANCE = 0.05;

function normalizarContrato(id: string): string {
  if (!id) return '';
  return id
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[-\s/]/g, '')
    .replace(/(CM1|CM2)$/, '');
}

export function reconcile(
  inperRows: INPerRow[],
  pcomRows: PCOMRow[]
): {
  maestra: ContratoMaestro[];
  resumen: ResumenEstatus[];
  pcomPorContrato: Map<string, PCOMRow[]>;
} {
  // --- Build unique contracts from INPer ---
  // INPer can have multiple rows per contract (one per partida).
  // Financial amounts that repeat across partidas must not be double-counted.
  // We use the 'Contrato' deduplicated field when available, otherwise 'No. de contrato'
  const contractMap = new Map<string, INPerRow[]>();

  for (const row of inperRows) {
    const contractId = (row['No. de contrato'] ?? '').toString().trim();
    if (!contractId) continue;
    const existing = contractMap.get(contractId) ?? [];
    existing.push(row);
    contractMap.set(contractId, existing);
  }

  // --- Build PCOM index by CTOEXT ---
  const pcomByCtoext = new Map<string, PCOMRow[]>();
  for (const row of pcomRows) {
    const ctoext = (row.CTOEXT ?? '').toString().trim();
    if (!ctoext || ctoext === 'SIN CONTRATO' || ctoext === 'NO APLICA') continue;
    const existing = pcomByCtoext.get(ctoext) ?? [];
    existing.push(row);
    pcomByCtoext.set(ctoext, existing);
  }

  // Build normalized PCOM index for fallback matching
  const pcomByNorm = new Map<string, string[]>(); // norm -> original ctoexts
  for (const ctoext of pcomByCtoext.keys()) {
    const norm = normalizarContrato(ctoext);
    const existing = pcomByNorm.get(norm) ?? [];
    existing.push(ctoext);
    pcomByNorm.set(norm, existing);
  }

  // --- Process each unique INPer contract ---
  const maestra: ContratoMaestro[] = [];
  const pcomPorContrato = new Map<string, PCOMRow[]>();

  for (const [contractId, rows] of contractMap) {
    // Aggregate INPer financials — use first non-zero/non-duplicate value
    // Amounts that appear on every row (because they're contract-level) must be taken once
    const estimacion = getUniqueAmount(rows, '__Estimación del monto por ejercer') ??
      getUniqueAmount(rows, 'Estimación del monto por ejercer') ?? 0;
    const modificadoINPer = getUniqueAmount(rows, '__Monto con que fue registrado el compromiso en SICOP') ??
      getUniqueAmount(rows, 'Monto con que fue registrado el compromiso en SICOP') ?? 0;
    const pagadoINPer = getUniqueAmount(rows, '__Monto pagado del contrato') ??
      getUniqueAmount(rows, 'Monto pagado del contrato') ?? 0;
    const montoEjercer = getUniqueAmount(rows, '__Monto por ejercer') ??
      getUniqueAmount(rows, 'Monto por ejercer') ?? 0;

    // --- Link to PCOM ---
    let pcomRows2: PCOMRow[] = [];
    let tipoVinculacion = 'SIN VINCULACIÓN';
    let contratoPCOM = '';

    // Step 1: exact match
    if (pcomByCtoext.has(contractId)) {
      pcomRows2 = pcomByCtoext.get(contractId)!;
      tipoVinculacion = 'EXACTA';
      contratoPCOM = contractId;
    } else {
      // Step 2: normalized match
      const normId = normalizarContrato(contractId);
      const candidates = pcomByNorm.get(normId) ?? [];

      if (candidates.length === 1) {
        contratoPCOM = candidates[0];
        pcomRows2 = pcomByCtoext.get(contratoPCOM)!;
        tipoVinculacion = 'NORMALIZADA';
      } else if (candidates.length > 1) {
        // Ambiguous — mark as pending
        tipoVinculacion = 'AMBIGUA';
      }
    }

    if (pcomRows2.length > 0) {
      pcomPorContrato.set(contractId, pcomRows2);
    }

    // --- Aggregate PCOM financials ---
    let comprometidoSICOP = 0;
    let modificadoSICOP = 0;
    let ejercidoSICOP = 0;
    let disponibleSICOP = 0;

    if (pcomRows2.length > 0) {
      for (const p of pcomRows2) {
        comprometidoSICOP += toNum(p.COMPROMISO);
        modificadoSICOP += toNum(p.MODIFICADO);
        ejercidoSICOP += toNum(p.EJERCIDO);
        disponibleSICOP += toNum(p.DISPONIBLE);
      }
    }

    // --- Classify ---
    let estatus: Estatus;
    let saldo = 0;
    let coberturaPorc: number | null = null;

    if (tipoVinculacion === 'SIN VINCULACIÓN' || tipoVinculacion === 'AMBIGUA') {
      estatus = 'PENDIENTE VINCULACIÓN SICOP';
      saldo = 0;
    } else {
      saldo = disponibleSICOP - estimacion;
      if (Math.abs(saldo) <= TOLERANCE) {
        estatus = 'EQUILIBRADO';
      } else if (saldo < 0) {
        estatus = 'FALTA RECURSO';
      } else {
        estatus = 'SOBRA RECURSO';
      }
      if (estimacion > 0) {
        coberturaPorc = (disponibleSICOP / estimacion) * 100;
      }
    }

    maestra.push({
      contrato: contractId,
      contratoPCOM,
      tipoVinculacion,
      comprometidoSICOP,
      modificadoSICOP,
      ejercidoSICOP,
      disponibleSICOP,
      modificadoINPer,
      pagadoINPer,
      montoEjercerINPer: montoEjercer,
      estimacionINPer: estimacion,
      saldo,
      estatus,
      coberturaPorc,
      renglonesPCOM: pcomRows2.length,
      renglomesINPer: rows.length,
    });
  }

  // --- Build resumen ---
  const resumenMap = new Map<Estatus, ResumenEstatus>();
  const estatuses: Estatus[] = ['EQUILIBRADO', 'FALTA RECURSO', 'SOBRA RECURSO', 'PENDIENTE VINCULACIÓN SICOP'];
  for (const e of estatuses) {
    resumenMap.set(e, { estatus: e, contratos: 0, disponibleSICOP: 0, estimacionINPer: 0, saldo: 0 });
  }

  for (const c of maestra) {
    const r = resumenMap.get(c.estatus)!;
    r.contratos++;
    if (c.estatus !== 'PENDIENTE VINCULACIÓN SICOP') {
      r.disponibleSICOP += c.disponibleSICOP;
    }
    r.estimacionINPer += c.estimacionINPer;
    r.saldo += c.saldo;
  }

  const resumen = estatuses.map(e => resumenMap.get(e)!);

  return { maestra, resumen, pcomPorContrato };
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function getUniqueAmount(rows: INPerRow[], field: string): number | null {
  const values = rows
    .map(r => {
      const v = r[field];
      if (v === null || v === undefined || v === '') return null;
      const s = v.toString().replace(/[$,\s]/g, '');
      if (s === '-' || s === '') return 0;
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    })
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;
  // If all values are the same (repeated per partida), return once
  const unique = [...new Set(values)];
  if (unique.length === 1) return unique[0];
  // If multiple distinct values, sum only distinct ones
  return unique.reduce((a, b) => a + b, 0);
}
