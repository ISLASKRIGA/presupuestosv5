import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import type { AppData } from '../types';
import { fmt$ } from '../utils/format';
import KPICard from './KPICard';
import StatusBadge from './StatusBadge';

const COLORS: Record<string, string> = {
  'EQUILIBRADO': '#16a34a',
  'FALTA RECURSO': '#dc2626',
  'SOBRA RECURSO': '#2563eb',
  'PENDIENTE VINCULACIÓN SICOP': '#d97706',
};

interface Props { data: AppData }

export default function Dashboard({ data }: Props) {
  const { maestra, resumen } = data;

  const vinculados = maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');
  const pendientes = maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP');

  const totalDispVinculado = vinculados.reduce((s, c) => s + c.disponibleSICOP, 0);
  const totalEstimVinculada = vinculados.reduce((s, c) => s + c.estimacionINPer, 0);
  const saldoVinculado = totalDispVinculado - totalEstimVinculada;
  const totalEstimPendiente = pendientes.reduce((s, c) => s + c.estimacionINPer, 0);

  const pieData = resumen.map(r => ({ name: r.estatus, value: r.contratos }));

  const barData = resumen
    .filter(r => r.estatus !== 'PENDIENTE VINCULACIÓN SICOP')
    .map(r => ({
      name: r.estatus.replace(' RECURSO', '').replace('EQUILIBRADO', 'EQUIL.'),
      disponible: r.disponibleSICOP,
      estimacion: r.estimacionINPer,
    }));

  const topFalta = [...maestra]
    .filter(c => c.estatus === 'FALTA RECURSO')
    .sort((a, b) => a.saldo - b.saldo)
    .slice(0, 8);

  const topSobra = [...maestra]
    .filter(c => c.estatus === 'SOBRA RECURSO')
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Corte info */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 bg-gradient-to-r from-blue-800 to-teal-500 rounded-full" />
        <span className="text-sm font-semibold text-gray-500">CORTE: {data.corte}</span>
        <div className="h-1 flex-1 bg-gradient-to-r from-teal-500 to-blue-800 rounded-full" />
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total contratos INPer" value={maestra.length.toLocaleString()} />
        <KPICard label="Vinculados PCOM" value={vinculados.length.toLocaleString()} color="text-blue-700" />
        <KPICard label="Pendientes vinculación" value={pendientes.length.toLocaleString()} color="text-amber-600" />
        <KPICard
          label="Saldo vinculado"
          value={fmt$(saldoVinculado, true)}
          sub="Disponible SICOP − Estimación INPer"
          color={saldoVinculado >= 0 ? 'text-green-700' : 'text-red-700'}
        />
      </div>

      {/* Universo vinculado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard label="Disponible SICOP (vinculado)" value={fmt$(totalDispVinculado)} color="text-blue-700" />
        <KPICard label="Estimación INPer (vinculada)" value={fmt$(totalEstimVinculada)} color="text-gray-700" />
        <KPICard
          label="Exposición pendiente (INPer)"
          value={fmt$(totalEstimPendiente)}
          sub="SICOP: NO DETERMINADO"
          color="text-amber-700"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Distribución por Estatus (contratos)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ value }) => `${value}`}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] ?? '#888'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: unknown, name: unknown) => [String(v) + ' contratos', String(name)]} />
              <Legend
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Disponible SICOP vs Estimación INPer (universo vinculado, MXN)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt$(v, true)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: unknown) => fmt$(Number(v))} />
              <Legend />
              <Bar dataKey="disponible" name="Disponible SICOP" fill="#2563eb" />
              <Bar dataKey="estimacion" name="Estimación INPer" fill="#9333ea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla resumen estatus */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Resumen por Estatus</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Estatus</th>
                <th className="px-4 py-3 text-right">Contratos</th>
                <th className="px-4 py-3 text-right">Disponible SICOP</th>
                <th className="px-4 py-3 text-right">Estimación INPer</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resumen.map(r => (
                <tr key={r.estatus} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><StatusBadge estatus={r.estatus} /></td>
                  <td className="px-4 py-3 num font-semibold">{r.contratos}</td>
                  <td className="px-4 py-3 num">
                    {r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? 'NO DETERMINADO' : fmt$(r.disponibleSICOP)}
                  </td>
                  <td className="px-4 py-3 num">{fmt$(r.estimacionINPer)}</td>
                  <td className={`px-4 py-3 num font-semibold ${r.saldo < 0 ? 'text-red-600' : r.saldo > 0 ? 'text-green-600' : ''}`}>
                    {r.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? 'NO DETERMINAR' : fmt$(r.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Falta/Sobra */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100 bg-red-50">
            <h3 className="font-semibold text-red-700">Top Falta Recurso</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">Estimación</th>
                <th className="px-3 py-2 text-right">Déficit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topFalta.map(c => (
                <tr key={c.contrato} className="hover:bg-red-50">
                  <td className="px-3 py-2 font-mono text-xs">{c.contrato}</td>
                  <td className="px-3 py-2 num">{fmt$(c.disponibleSICOP, true)}</td>
                  <td className="px-3 py-2 num">{fmt$(c.estimacionINPer, true)}</td>
                  <td className="px-3 py-2 num text-red-700 font-bold">{fmt$(c.saldo, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-100 bg-blue-50">
            <h3 className="font-semibold text-blue-700">Top Sobra Recurso</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">Estimación</th>
                <th className="px-3 py-2 text-right">Excedente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topSobra.map(c => (
                <tr key={c.contrato} className="hover:bg-blue-50">
                  <td className="px-3 py-2 font-mono text-xs">{c.contrato}</td>
                  <td className="px-3 py-2 num">{fmt$(c.disponibleSICOP, true)}</td>
                  <td className="px-3 py-2 num">{fmt$(c.estimacionINPer, true)}</td>
                  <td className="px-3 py-2 num text-blue-700 font-bold">+{fmt$(c.saldo, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
