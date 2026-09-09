import { useState, useMemo } from 'react';
import type { ContratoMaestro, PCOMRow, Estatus } from '../types';
import { fmt$, fmtPct } from '../utils/format';
import StatusBadge from './StatusBadge';

interface Props {
  contracts: ContratoMaestro[];
  pcomPorContrato: Map<string, PCOMRow[]>;
  filterEstatus?: Estatus;
  title?: string;
}

const PAGE_SIZE = 50;

export default function ContractTable({ contracts, pcomPorContrato, filterEstatus, title }: Props) {
  const [search, setSearch] = useState('');
  const [estatusFilter, setEstatusFilter] = useState<string>(filterEstatus ?? 'TODOS');
  const [sortField, setSortField] = useState<keyof ContratoMaestro>('saldo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const estatuses = ['TODOS', 'EQUILIBRADO', 'FALTA RECURSO', 'SOBRA RECURSO', 'PENDIENTE VINCULACIÓN SICOP'];

  const filtered = useMemo(() => {
    let rows = contracts;
    if (estatusFilter !== 'TODOS') rows = rows.filter(c => c.estatus === estatusFilter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        c.contrato.toLowerCase().includes(q) ||
        c.contratoPCOM.toLowerCase().includes(q) ||
        c.estatus.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [contracts, estatusFilter, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function sort(field: keyof ContratoMaestro) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(0);
  }

  function SortArrow({ field }: { field: keyof ContratoMaestro }) {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-4">
      {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar contrato..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        {!filterEstatus && (
          <select
            value={estatusFilter}
            onChange={e => { setEstatusFilter(e.target.value); setPage(0); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {estatuses.map(e => <option key={e}>{e}</option>)}
          </select>
        )}
        <span className="text-xs text-gray-500 ml-auto">
          {filtered.length} contratos{search || estatusFilter !== 'TODOS' ? ' (filtrados)' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="table-header">
                <th className="px-3 py-3 text-left cursor-pointer select-none" onClick={() => sort('contrato')}>
                  Contrato <SortArrow field="contrato" />
                </th>
                <th className="px-3 py-3 text-left">Vínculo PCOM</th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('comprometidoSICOP')}>
                  Comprometido SICOP <SortArrow field="comprometidoSICOP" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('modificadoSICOP')}>
                  Modificado SICOP <SortArrow field="modificadoSICOP" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('ejercidoSICOP')}>
                  Ejercido/Pagado SICOP <SortArrow field="ejercidoSICOP" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('disponibleSICOP')}>
                  Disponible SICOP <SortArrow field="disponibleSICOP" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('modificadoINPer')}>
                  Modif. INPer <SortArrow field="modificadoINPer" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('pagadoINPer')}>
                  Pagado INPer <SortArrow field="pagadoINPer" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('estimacionINPer')}>
                  Estimación INPer <SortArrow field="estimacionINPer" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('saldo')}>
                  Saldo <SortArrow field="saldo" />
                </th>
                <th className="px-3 py-3 text-center cursor-pointer" onClick={() => sort('estatus')}>
                  Estatus <SortArrow field="estatus" />
                </th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => sort('coberturaPorc')}>
                  Cobertura <SortArrow field="coberturaPorc" />
                </th>
                <th className="px-3 py-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.map(c => (
                <>
                  <tr key={c.contrato} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-mono font-semibold text-blue-800">{c.contrato}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.tipoVinculacion === 'EXACTA' ? 'bg-green-100 text-green-700' : c.tipoVinculacion === 'NORMALIZADA' ? 'bg-blue-100 text-blue-700' : c.tipoVinculacion === 'AMBIGUA' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.tipoVinculacion}
                      </span>
                    </td>
                    <td className="px-3 py-2 num">{fmt$(c.comprometidoSICOP, true)}</td>
                    <td className="px-3 py-2 num">{fmt$(c.modificadoSICOP, true)}</td>
                    <td className="px-3 py-2 num">{fmt$(c.ejercidoSICOP, true)}</td>
                    <td className="px-3 py-2 num font-semibold">{c.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? '—' : fmt$(c.disponibleSICOP, true)}</td>
                    <td className="px-3 py-2 num">{fmt$(c.modificadoINPer, true)}</td>
                    <td className="px-3 py-2 num">{fmt$(c.pagadoINPer, true)}</td>
                    <td className="px-3 py-2 num font-semibold">{fmt$(c.estimacionINPer, true)}</td>
                    <td className={`px-3 py-2 num font-bold ${c.saldo < 0 ? 'text-red-600' : c.saldo > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                      {c.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? '—' : fmt$(c.saldo, true)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge estatus={c.estatus} />
                    </td>
                    <td className="px-3 py-2 num">
                      {c.coberturaPorc !== null ? fmtPct(c.coberturaPorc) : 'N/D'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => setExpanded(expanded === c.contrato ? null : c.contrato)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        {expanded === c.contrato ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expanded === c.contrato && (
                    <tr key={`${c.contrato}-detail`}>
                      <td colSpan={13} className="bg-slate-50 px-6 py-4">
                        <PCOMDetail
                          contrato={c.contrato}
                          pcomRows={pcomPorContrato.get(c.contrato) ?? []}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400">Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-gray-100"
          >← Anterior</button>
          <span className="text-gray-500">Página {page + 1} de {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-gray-100"
          >Siguiente →</button>
        </div>
      )}
    </div>
  );
}

function PCOMDetail({ contrato, pcomRows }: { contrato: string; pcomRows: PCOMRow[] }) {
  if (pcomRows.length === 0) {
    return (
      <div className="text-sm text-amber-600">
        <strong>{contrato}</strong> — Sin líneas PCOM vinculadas (PENDIENTE VINCULACIÓN SICOP)
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">
        Líneas PCOM vinculadas al contrato <strong className="font-mono text-blue-700">{contrato}</strong>
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="pr-4 py-1 text-left">NO_COMPROMISO</th>
              <th className="pr-4 py-1 text-left">CTOEXT</th>
              <th className="pr-4 py-1 text-right">Comprometido</th>
              <th className="pr-4 py-1 text-right">Modificado</th>
              <th className="pr-4 py-1 text-right">Ejercido</th>
              <th className="pr-4 py-1 text-right">Disponible</th>
              <th className="pr-4 py-1 text-left">Proveedor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pcomRows.map((p, i) => (
              <tr key={i} className="font-mono">
                <td className="pr-4 py-1">{p.NO_COMPROMISO}</td>
                <td className="pr-4 py-1">{p.CTOEXT}</td>
                <td className="pr-4 py-1 text-right">{fmt$(p.COMPROMISO as number, true)}</td>
                <td className="pr-4 py-1 text-right">{fmt$(p.MODIFICADO as number, true)}</td>
                <td className="pr-4 py-1 text-right">{fmt$(p.EJERCIDO as number, true)}</td>
                <td className="pr-4 py-1 text-right font-bold text-blue-700">{fmt$(p.DISPONIBLE as number, true)}</td>
                <td className="pr-4 py-1 font-sans truncate max-w-xs">{(p.NOMBRE_PROVEEDOR as string) ?? '—'}</td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-gray-400">
              <td colSpan={2} className="pr-4 py-1 font-sans">TOTAL</td>
              <td className="pr-4 py-1 text-right">{fmt$(pcomRows.reduce((s, p) => s + (p.COMPROMISO as number || 0), 0), true)}</td>
              <td className="pr-4 py-1 text-right">{fmt$(pcomRows.reduce((s, p) => s + (p.MODIFICADO as number || 0), 0), true)}</td>
              <td className="pr-4 py-1 text-right">{fmt$(pcomRows.reduce((s, p) => s + (p.EJERCIDO as number || 0), 0), true)}</td>
              <td className="pr-4 py-1 text-right text-blue-700">{fmt$(pcomRows.reduce((s, p) => s + (p.DISPONIBLE as number || 0), 0), true)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
