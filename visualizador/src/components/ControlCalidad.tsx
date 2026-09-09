import type { AppData } from '../types';
import { fmt$ } from '../utils/format';

interface Props { data: AppData }

export default function ControlCalidad({ data }: Props) {
  const { maestra, control, pcom } = data;
  const vinc = maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');
  const pend = maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP');
  const dupl = maestra.filter((c, i) => maestra.findIndex(x => x.contrato === c.contrato) !== i);
  const ambi = maestra.filter(c => c.tipoVinculacion === 'AMBIGUA');
  const sinEst = maestra.filter(c => c.estimacionINPer === 0 && c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');

  const totalDisp = vinc.reduce((s, c) => s + c.disponibleSICOP, 0);
  const totalEstim = vinc.reduce((s, c) => s + c.estimacionINPer, 0);
  const totalPend = pend.reduce((s, c) => s + c.estimacionINPer, 0);

  const pcomSinInper = pcom.filter(p => {
    const cto = (p.CTOEXT ?? '').toString().trim();
    if (!cto || cto === 'SIN CONTRATO' || cto === 'NO APLICA') return false;
    return !maestra.some(c => c.contratoPCOM === cto || c.contrato === cto);
  });

  type Row = { control: string; valor: string | number; criterio: string; ok: boolean | null };
  const checks: Row[] = [
    { control: 'Total contratos INPer',           valor: maestra.length,        criterio: '623 esperados',              ok: maestra.length === 623 },
    { control: 'Contratos vinculados',             valor: vinc.length,           criterio: '418 esperados',              ok: vinc.length === 418 },
    { control: 'Contratos pendientes vinculación', valor: pend.length,           criterio: '205 esperados',              ok: pend.length === 205 },
    { control: 'EQUILIBRADO',                      valor: maestra.filter(c => c.estatus === 'EQUILIBRADO').length,    criterio: '201 esperados', ok: maestra.filter(c => c.estatus === 'EQUILIBRADO').length === 201 },
    { control: 'FALTA RECURSO',                    valor: maestra.filter(c => c.estatus === 'FALTA RECURSO').length,  criterio: '124 esperados', ok: maestra.filter(c => c.estatus === 'FALTA RECURSO').length === 124 },
    { control: 'SOBRA RECURSO',                    valor: maestra.filter(c => c.estatus === 'SOBRA RECURSO').length,  criterio: '93 esperados',  ok: maestra.filter(c => c.estatus === 'SOBRA RECURSO').length === 93 },
    { control: 'Disponible SICOP vinculado',       valor: fmt$(totalDisp),       criterio: '$101,064,536.76 esperado',  ok: Math.abs(totalDisp - 101064536.76) < 1 },
    { control: 'Estimación INPer vinculada',       valor: fmt$(totalEstim),      criterio: '$91,374,018.70 esperada',   ok: Math.abs(totalEstim - 91374018.70) < 1 },
    { control: 'Estimación INPer pendientes',      valor: fmt$(totalPend),       criterio: '$6,695,145.04 esperada',    ok: Math.abs(totalPend - 6695145.04) < 1 },
    { control: 'Contratos duplicados',             valor: dupl.length,           criterio: '0 duplicados',              ok: dupl.length === 0 },
    { control: 'Vínculos ambiguos',                valor: ambi.length,           criterio: '0 ambiguos',                ok: ambi.length === 0 },
    { control: 'PCOM sin contrato INPer',          valor: pcomSinInper.length,   criterio: 'Revisar',                   ok: null },
    { control: 'Vinculados sin estimación',        valor: sinEst.length,         criterio: 'Revisar si > 0',            ok: null },
  ];

  const passed = checks.filter(c => c.ok === true).length;
  const failed = checks.filter(c => c.ok === false).length;

  return (
    <div className="fade-up gap-y section-pad">
      <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)', display: 'flex', alignItems: 'center', gap: 8 }}>
        🛡️ Control de Calidad y Validación
      </h2>

      {/* Score */}
      <div className="kpi-grid" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="kpi-card">
          <span className="kpi-label">✅ Checks OK</span>
          <span className="kpi-value green">{passed}</span>
        </div>
        <div className="kpi-card red-l">
          <span className="kpi-label">❌ Checks fallidos</span>
          <span className={`kpi-value ${failed > 0 ? 'red' : 'white'}`}>{failed}</span>
        </div>
        <div className="kpi-card yellow-l">
          <span className="kpi-label">⚠️ PCOM sin INPer</span>
          <span className="kpi-value yellow">{pcomSinInper.length}</span>
        </div>
        <div className="kpi-card purple-l">
          <span className="kpi-label">⚠️ Sin estimación INPer</span>
          <span className="kpi-value purple">{sinEst.length}</span>
        </div>
      </div>

      {/* Checks table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Control</th>
            <th className="num">Valor calculado</th>
            <th>Criterio (Corte 09SEP26)</th>
            <th style={{ textAlign: 'center' }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr key={i} style={c.ok === false ? { background: 'rgba(239,68,68,0.05)' } : c.ok === true ? { background: 'rgba(34,197,94,0.04)' } : {}}>
              <td style={{ fontWeight: 600, color: 'var(--white)' }}>{c.control}</td>
              <td className="num white" style={{ fontWeight: 800 }}>{String(c.valor)}</td>
              <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{c.criterio}</td>
              <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                {c.ok === true && '✅'}
                {c.ok === false && '❌'}
                {c.ok === null && <span style={{ color: 'var(--muted)' }}>—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stored controls */}
      {control.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Controles del archivo (hoja Control validación)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Control</th>
                <th className="num">Valor</th>
                <th>Criterio</th>
              </tr>
            </thead>
            <tbody>
              {control.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.Control}</td>
                  <td className="num white" style={{ fontWeight: 800 }}>{String(c.Valor)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{c.Criterio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* PCOM sin INPer */}
      {pcomSinInper.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--yellow)', textTransform: 'uppercase' }}>⚠️ PCOM sin contrato INPer ({pcomSinInper.length} registros)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>NO_COMPROMISO</th>
                <th>CTOEXT</th>
                <th className="num cyan">Disponible</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {pcomSinInper.slice(0, 30).map((p, i) => (
                <tr key={i}>
                  <td className="font-mono" style={{ color: 'var(--muted)' }}>{String(p.NO_COMPROMISO)}</td>
                  <td className="font-mono yellow">{String(p.CTOEXT)}</td>
                  <td className="num cyan">{fmt$(p.DISPONIBLE as number, true)}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(p.NOMBRE_PROVEEDOR ?? '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
