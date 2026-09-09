export function fmt$(n: number | null | undefined, compact = false): string {
  if (n === null || n === undefined) return 'N/D';
  const abs = Math.abs(n);
  if (compact && abs >= 1_000_000)
    return (n < 0 ? '-' : '') + '$' + (abs / 1_000_000).toFixed(1) + 'M';
  if (compact && abs >= 1_000)
    return (n < 0 ? '-' : '') + '$' + (abs / 1_000).toFixed(0) + 'K';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/D';
  return n.toFixed(1) + '%';
}

export function saldoClass(saldo: number): string {
  if (saldo < -0.05) return 'red';
  if (saldo > 0.05)  return 'green';
  return 'yellow';
}
