import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart as HBarChart, Bar as HBar,
} from 'recharts';
import type { AppData } from '../types';
import { fmt$ } from '../utils/format';
import KPICard from './KPICard';

interface Props { data: AppData }

const TOOLTIP_STYLE = {
  background: '#111827', border: '1px solid #1e2d45', borderRadius: 8,
  fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#f0f4f8',
};

export default function Dashboard({ data }: Props) {
  const { maestra, resumen } = data;

  const vinc    = maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');
  const falta   = maestra.filter(c => c.estatus === 'FALTA RECURSO');
  const sobra   = maestra.filter(c => c.estatus === 'SOBRA RECURSO');
  const equil   = maestra.filter(c => c.estatus === 'EQUILIBRADO');
  const pend    = maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP');

  const totalDisp  = vinc.reduce((s, c) => s + c.disponibleSICOP, 0);
  const totalEstim = vinc.reduce((s, c) => s + c.estimacionINPer, 0);
  const saldo      = totalDisp - totalEstim;

  const faltaSum = falta.reduce((s, c) => s + c.saldo, 0);
  const sobraSum = sobra.reduce((s, c) => s + c.saldo, 0);
  const pendEstim= pend.reduce((s, c) => s + c.estimacionINPer, 0);

  // Bar chart data
  const barData = [
    { name: 'Disponible SICOP (AT)', value: totalDisp },
    { name: 'Estimación INPer (AV)', value: totalEstim },
  ];

  // Donut data
  const pieData = resumen
    .filter(r => r.estatus !== 'PENDIENTE VINCULACIÓN SICOP')
    .map(r => ({
      name: r.estatus === 'EQUILIBRADO' ? 'Equilibrado' : r.estatus === 'SOBRA RECURSO' ? 'Sobra Recurso' : 'Falta Recurso',
      value: r.contratos,
    }));
  const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  // Top rankings
  const topFalta = [...falta].sort((a, b) => a.saldo - b.saldo).slice(0, 5);

  // Conclusion estatus
  const conclusionClass = saldo < 0 ? 'falta' : saldo > 0 ? 'sobra' : 'equil';
  const conclusionLabel = saldo < 0
    ? `FALTA RECURSO POR ${fmt$(Math.abs(saldo))}`
    : saldo > 0
    ? `SOBRA RECURSO POR ${fmt$(saldo)}`
    : 'EQUILIBRADO';

  const mayorFaltante = topFalta[0];

  return (
    <div className="fade-up gap-y">

      {/* ── Conclusión ejecutiva ── */}
      <div className="conclusion-banner">
        <div className="conclusion-title">
          🎯 CONCLUSIÓN EJECUTIVA DE SUFICIENCIA PRESUPUESTAL (UNIVERSO CONCILIADO)
        </div>
        <span className={`conclusion-badge ${conclusionClass}`}>{conclusionLabel}</span>

        <ul className="conclusion-list">
          <li><strong>Disponible SICOP Real (AT):</strong> <span className="hl-cyan">{fmt$(totalDisp)}</span></li>
          <li><strong>Estimación INPer Conciliado (AV):</strong> <span className="hl-purple">{fmt$(totalEstim)}</span></li>
          <li><strong>Saldo Real de Suficiencia:</strong> <span className={saldo < 0 ? 'hl-red' : 'hl-green'}>{fmt$(saldo)}</span></li>
          <li><strong>Conclusión Financiera:</strong>{' '}
            <span className={saldo < 0 ? 'hl-red' : 'hl-green'}>
              {saldo < 0 ? `FALTA RECURSO POR ${fmt$(Math.abs(saldo))}.` : `SOBRA RECURSO POR ${fmt$(saldo)}.`}
            </span>
          </li>
        </ul>

        <p className="conclusion-note">
          Distribución de Contratos:{' '}
          <strong className="hl-green">{sobra.length} contratos</strong> presentan Recurso Excedente ({fmt$(sobraSum)}),{' '}
          <strong className="hl-yellow">{equil.length} contratos</strong> se encuentran Equilibrados, y{' '}
          <strong className="hl-red">{falta.length} contratos</strong> presentan Insuficiencia Presupuestal ({fmt$(faltaSum)}).
          {mayorFaltante && (
            <> El mayor faltante individual corresponde al contrato{' '}
              <strong>{mayorFaltante.contrato}</strong> por{' '}
              <strong className="hl-red">{fmt$(mayorFaltante.saldo)}</strong>.
            </>
          )}
          {pend.length > 0 && (
            <> Adicionalmente, <strong className="hl-yellow">{pend.length} contratos</strong> están pendientes de vinculación SICOP con exposición INPer de <strong className="hl-yellow">{fmt$(pendEstim)}</strong>.
            </>
          )}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <KPICard label="Disponible SICOP Real" value={fmt$(totalDisp)} sub="Universo Conciliado (AT)" valueColor="cyan" borderColor="cyan" />
        <KPICard label="Estimación INPer por ejercer" value={fmt$(totalEstim)} sub="Universo Conciliado (AV)" valueColor="purple" borderColor="purple" />
        <KPICard label="Saldo Real de Suficiencia" value={fmt$(saldo)} sub={saldo < 0 ? 'FALTA RECURSO' : 'SOBRA RECURSO'} valueColor={saldo < 0 ? 'red' : 'green'} borderColor={saldo < 0 ? 'red' : 'green'} />
        <KPICard label="Sobrante Total Acumulado" value={fmt$(sobraSum, true)} sub={`${sobra.length} Contratos con excedente`} valueColor="green" borderColor="green" />
        <KPICard label="Faltante Total Acumulado" value={fmt$(faltaSum, true)} sub={`${falta.length} Contratos con insuficiencia`} valueColor="red" borderColor="red" />
        <KPICard label="Universo Conciliado" value={String(vinc.length)} sub={`${vinc.length} Compromisos Conciliados`} valueColor="white" borderColor="blue" />
        {pend.length > 0 && (
          <KPICard label="Pendientes Vinculación" value={String(pend.length)} sub={`Exposición: ${fmt$(pendEstim, true)}`} valueColor="yellow" borderColor="yellow" />
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="charts-grid">
        {/* Bar */}
        <div className="chart-card">
          <div className="chart-title">Disponible SICOP Real vs. Estimación INPer</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
              <XAxis dataKey="name" tick={{ fill: '#5a6a88', fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt$(v, true)} tick={{ fill: '#5a6a88', fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => fmt$(Number(v))} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#00d4ff" />
                <Cell fill="#a855f7" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="chart-card">
          <div className="chart-title">Distribución por Estatus de Suficiencia</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="45%" outerRadius={85} innerRadius={50}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown, n: unknown) => [String(v) + ' contratos', String(n)]} />
              <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ color: '#c4cdd8', fontSize: '0.78rem' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal ranking */}
        <div className="chart-card">
          <div className="chart-title">Top Rankings de Impacto — Mayor Faltante</div>
          <ResponsiveContainer width="100%" height={220}>
            <HBarChart data={topFalta} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" horizontal={false} />
              <XAxis type="number" tickFormatter={v => fmt$(v, true)} tick={{ fill: '#5a6a88', fontSize: 10 }} />
              <YAxis type="category" dataKey="contrato" tick={{ fill: '#c4cdd8', fontSize: 10 }} width={110} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: unknown) => fmt$(Number(v))} />
              <HBar dataKey="saldo" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </HBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Resumen tabla ── */}
      <div className="section-pad">
        <table className="data-table">
          <thead>
            <tr>
              <th>Estatus</th>
              <th className="num">Contratos</th>
              <th className="num cyan">Disponible SICOP</th>
              <th className="num purple">Estimación INPer</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map(r => (
              <tr key={r.estatus}>
                <td><StatusPill estatus={r.estatus} /></td>
                <td className="num white" style={{ fontSize: '1rem', fontWeight: 800 }}>{r.contratos}</td>
                <td className="num cyan">{r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? <span style={{ color: 'var(--yellow)' }}>NO DETERMINADO</span> : fmt$(r.disponibleSICOP)}</td>
                <td className="num purple">{fmt$(r.estimacionINPer)}</td>
                <td className={`num ${r.saldo < 0 ? 'red' : r.saldo > 0 ? 'green' : 'yellow'}`} style={{ fontWeight: 800 }}>
                  {r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? <span style={{ color: 'var(--muted)' }}>—</span> : fmt$(r.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ estatus }: { estatus: string }) {
  const cls = estatus === 'SOBRA RECURSO' ? 'pill-green' : estatus === 'FALTA RECURSO' ? 'pill-red' : estatus === 'EQUILIBRADO' ? 'pill-yellow' : 'pill-gray';
  return <span className={`status-pill ${cls}`}>{estatus}</span>;
}
