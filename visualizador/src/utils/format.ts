export function fmt$(n: number | null | undefined, compact = false): string {
  if (n === null || n === undefined) return 'N/D';
  if (compact && Math.abs(n) >= 1_000_000) {
    return '$' + (n / 1_000_000).toFixed(2) + 'M';
  }
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/D';
  return n.toFixed(1) + '%';
}

export function statusClass(estatus: string): string {
  if (estatus === 'EQUILIBRADO') return 'status-equilibrado';
  if (estatus === 'FALTA RECURSO') return 'status-falta';
  if (estatus === 'SOBRA RECURSO') return 'status-sobra';
  return 'status-pendiente';
}

export function statusLabel(estatus: string): string {
  return estatus;
}
