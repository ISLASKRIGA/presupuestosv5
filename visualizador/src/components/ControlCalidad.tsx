import type { AppData } from '../types';
import { fmt$ } from '../utils/format';

interface Props { data: AppData }

export default function ControlCalidad({ data }: Props) {
  const { maestra, control, pcom } = data;

  // Runtime controls
  const duplicados = maestra.filter(
    (c, i) => maestra.findIndex(x => x.contrato === c.contrato) !== i
  );

  const vinculados = maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');
  const pendientes = maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP');
  const ambiguos = maestra.filter(c => c.tipoVinculacion === 'AMBIGUA');

  const totalDispVinc = vinculados.reduce((s, c) => s + c.disponibleSICOP, 0);
  const totalEstimVinc = vinculados.reduce((s, c) => s + c.estimacionINPer, 0);
  const totalEstimPend = pendientes.reduce((s, c) => s + c.estimacionINPer, 0);

  const pcomSinInper = pcom.filter(p => {
    const cto = (p.CTOEXT ?? '').toString().trim();
    if (!cto || cto === 'SIN CONTRATO' || cto === 'NO APLICA') return false;
    return !maestra.some(c => c.contratoPCOM === cto || c.contrato === cto);
  });

  const sinEstimacion = maestra.filter(c => c.estimacionINPer === 0 && c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');

  const checks = [
    {
      control: 'Total contratos INPer',
      valor: maestra.length,
      criterio: '623 esperados',
      ok: maestra.length === 623,
    },
    {
      control: 'Contratos vinculados',
      valor: vinculados.length,
      criterio: '418 esperados',
      ok: vinculados.length === 418,
    },
    {
      control: 'Contratos pendientes vinculación',
      valor: pendientes.length,
      criterio: '205 esperados',
      ok: pendientes.length === 205,
    },
    {
      control: 'EQUILIBRADO',
      valor: maestra.filter(c => c.estatus === 'EQUILIBRADO').length,
      criterio: '201 esperados',
      ok: maestra.filter(c => c.estatus === 'EQUILIBRADO').length === 201,
    },
    {
      control: 'FALTA RECURSO',
      valor: maestra.filter(c => c.estatus === 'FALTA RECURSO').length,
      criterio: '124 esperados',
      ok: maestra.filter(c => c.estatus === 'FALTA RECURSO').length === 124,
    },
    {
      control: 'SOBRA RECURSO',
      valor: maestra.filter(c => c.estatus === 'SOBRA RECURSO').length,
      criterio: '93 esperados',
      ok: maestra.filter(c => c.estatus === 'SOBRA RECURSO').length === 93,
    },
    {
      control: 'Disponible SICOP vinculado',
      valor: fmt$(totalDispVinc),
      criterio: '$101,064,536.76 esperado',
      ok: Math.abs(totalDispVinc - 101064536.76) < 1,
    },
    {
      control: 'Estimación INPer vinculada',
      valor: fmt$(totalEstimVinc),
      criterio: '$91,374,018.70 esperada',
      ok: Math.abs(totalEstimVinc - 91374018.70) < 1,
    },
    {
      control: 'Estimación INPer pendientes',
      valor: fmt$(totalEstimPend),
      criterio: '$6,695,145.04 esperada',
      ok: Math.abs(totalEstimPend - 6695145.04) < 1,
    },
    {
      control: 'Contratos duplicados',
      valor: duplicados.length,
      criterio: '0 duplicados',
      ok: duplicados.length === 0,
    },
    {
      control: 'Vínculos ambiguos',
      valor: ambiguos.length,
      criterio: '0 ambiguos',
      ok: ambiguos.length === 0,
    },
    {
      control: 'PCOM sin contrato INPer',
      valor: pcomSinInper.length,
      criterio: 'Revisar',
      ok: null,
    },
    {
      control: 'Contratos vinculados sin estimación',
      valor: sinEstimacion.length,
      criterio: 'Revisar si > 0',
      ok: null,
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">Control de Calidad y Validación</h2>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Checks automáticos vs. Corte 09SEP26</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Control</th>
              <th className="px-4 py-3 text-right">Valor calculado</th>
              <th className="px-4 py-3 text-left">Criterio</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {checks.map((c, i) => (
              <tr key={i} className={c.ok === false ? 'bg-red-50' : c.ok === true ? 'bg-green-50' : ''}>
                <td className="px-4 py-2 font-medium">{c.control}</td>
                <td className="px-4 py-2 num font-mono">{String(c.valor)}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{c.criterio}</td>
                <td className="px-4 py-2 text-center">
                  {c.ok === true && <span className="text-green-600 font-bold">✓</span>}
                  {c.ok === false && <span className="text-red-600 font-bold">✗</span>}
                  {c.ok === null && <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stored control sheet */}
      {control.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Controles del archivo (hoja Control validación)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Control</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Criterio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {control.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{c.Control}</td>
                  <td className="px-4 py-2 num font-mono">{String(c.Valor)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{c.Criterio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PCOM sin INPer */}
      {pcomSinInper.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50">
            <h3 className="font-semibold text-amber-700">PCOM sin contrato INPer ({pcomSinInper.length} registros)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2 text-left">NO_COMPROMISO</th>
                  <th className="px-3 py-2 text-left">CTOEXT</th>
                  <th className="px-3 py-2 text-right">Disponible</th>
                  <th className="px-3 py-2 text-left">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pcomSinInper.slice(0, 30).map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono">{String(p.NO_COMPROMISO)}</td>
                    <td className="px-3 py-1.5 font-mono text-amber-700">{p.CTOEXT as string}</td>
                    <td className="px-3 py-1.5 num">{fmt$(p.DISPONIBLE as number, true)}</td>
                    <td className="px-3 py-1.5 truncate max-w-xs">{(p.NOMBRE_PROVEEDOR as string) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
