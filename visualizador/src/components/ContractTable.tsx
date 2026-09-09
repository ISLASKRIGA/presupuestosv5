import { useState, useMemo } from 'react';
import type { ContratoMaestro, PCOMRow, Estatus } from '../types';
import { fmt$, fmtPct, saldoClass } from '../utils/format';
import StatusBadge from './StatusBadge';

interface Props {
  contracts: ContratoMaestro[];
  pcomPorContrato: Map<string, PCOMRow[]>;
  filterEstatus?: Estatus;
  title?: string;
  inperRows?: Record<string, unknown>[];
}

const PAGE_SIZE = 50;

function VinculoBadge({ tipo }: { tipo: string }) {
  const cls = tipo === 'EXACTA' ? 'vb-exacta' : tipo === 'NORMALIZADA' ? 'vb-normalizada' : tipo === 'AMBIGUA' ? 'vb-ambigua' : 'vb-sin';
  return <span className={`vinculo-badge ${cls}`}>{tipo}</span>;
}

type FilterKey = 'TODOS' | Estatus;

export default function ContractTable({ contracts, pcomPorContrato, filterEstatus, title, inperRows }: Props) {
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterKey>(filterEstatus ?? 'TODOS');
  const [sortField, setSortField] = useState<keyof ContratoMaestro>('saldo');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [page, setPage]           = useState(0);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = contracts;
    if (filter !== 'TODOS') rows = rows.filter(c => c.estatus === filter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(c =>
        c.contrato.toLowerCase().includes(q) ||
        c.contratoPCOM.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [contracts, filter, search, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function sort(f: keyof ContratoMaestro) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
    setPage(0);
  }

  function Arr({ f }: { f: keyof ContratoMaestro }) {
    if (sortField !== f) return <span style={{ opacity: 0.3, marginLeft: 3, fontSize: '0.65rem' }}>↕</span>;
    return <span style={{ marginLeft: 3, fontSize: '0.65rem' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  // Provider lookup from INPer rows
  function getProvider(contrato: string): { nombre: string; rfc: string } | null {
    if (!inperRows) return null;
    const row = inperRows.find(r => String(r['No. de contrato'] ?? '').trim() === contrato || String(r['Contrato'] ?? '').trim() === contrato) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { nombre: String(row['Proveedor'] ?? ''), rfc: String(row['RFC'] ?? '') };
  }

  // Count badge for header
  const countByStatus = useMemo(() => {
    const m: Record<string, number> = {};
    contracts.forEach(c => { m[c.estatus] = (m[c.estatus] || 0) + 1; });
    return m;
  }, [contracts]);

  return (
    <div className="fade-up">
      {title && (
        <div style={{ padding: '0 20px 14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)' }}>{title}</h2>
        </div>
      )}

      {/* Filter row */}
      <div className="filter-row">
        <span className="filter-label">Filtrar por Estatus:</span>
        {!filterEstatus && (
          <>
            <button className={`filter-btn ${filter === 'TODOS' ? 'active' : ''}`} onClick={() => { setFilter('TODOS'); setPage(0); }}>Todos</button>
            <button className={`filter-btn ${filter === 'SOBRA RECURSO' ? 'active' : ''}`} onClick={() => { setFilter('SOBRA RECURSO'); setPage(0); }}>
              <span className="filter-dot dot-green" /> Sobra Recurso
            </button>
            <button className={`filter-btn ${filter === 'EQUILIBRADO' ? 'active' : ''}`} onClick={() => { setFilter('EQUILIBRADO'); setPage(0); }}>
              <span className="filter-dot dot-yellow" /> Equilibrado
            </button>
            <button className={`filter-btn ${filter === 'FALTA RECURSO' ? 'active' : ''}`} onClick={() => { setFilter('FALTA RECURSO'); setPage(0); }}>
              <span className="filter-dot dot-red" /> Falta Recurso
            </button>
          </>
        )}
        <input
          type="text"
          placeholder="🔍 Buscar contrato..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ background: 'var(--bg-card2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 12px', color: 'var(--white)', fontFamily: 'inherit', fontSize: '0.78rem', outline: 'none', marginLeft: 8, width: 200 }}
        />
        <span className="filter-count" style={{ marginLeft: 'auto' }}>
          Mostrando <strong>{filtered.length}</strong> contratos{' '}
          {!filterEstatus && <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>(haz clic en cualquier fila para ver el desglose)</span>}
        </span>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }} />
              <th onClick={() => sort('contrato')}>NO. CONTRATO <Arr f="contrato" /></th>
              <th>PROVEEDOR</th>
              <th className="num">FOLIOS</th>
              <th className="num" onClick={() => sort('modificadoSICOP')}>MODIF. SICOP <Arr f="modificadoSICOP" /></th>
              <th className="num" onClick={() => sort('modificadoINPer')}>MODIF. INPER <Arr f="modificadoINPer" /></th>
              <th className="num">DIF. MODIF.</th>
              <th className="num" onClick={() => sort('ejercidoSICOP')}>PAGADO SICOP <Arr f="ejercidoSICOP" /></th>
              <th className="num" onClick={() => sort('pagadoINPer')}>PAGADO INPER <Arr f="pagadoINPer" /></th>
              <th className="num cyan" onClick={() => sort('disponibleSICOP')}>DISPONIBLE SICOP (AT) <Arr f="disponibleSICOP" /></th>
              <th className="num purple" onClick={() => sort('estimacionINPer')}>ESTIMACIÓN INPER (AV) <Arr f="estimacionINPer" /></th>
              <th className="num" onClick={() => sort('saldo')}>SALDO SUFICIENCIA <Arr f="saldo" /></th>
              <th>ESTATUS</th>
              <th className="num" onClick={() => sort('coberturaPorc')}>COB. % <Arr f="coberturaPorc" /></th>
            </tr>
          </thead>
          <tbody>
            {paged.map(c => {
              const isOpen = expanded === c.contrato;
              const provider = getProvider(c.contrato);
              const pcomRows = pcomPorContrato.get(c.contrato) ?? [];
              const difModif = c.modificadoSICOP - c.modificadoINPer;

              return (
                <>
                  <tr
                    key={c.contrato}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(isOpen ? null : c.contrato)}
                  >
                    <td>
                      <button className={`expand-btn ${isOpen ? 'open' : ''}`} onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : c.contrato); }}>
                        {isOpen ? '▼' : '▶'}
                      </button>
                    </td>
                    <td className="white font-mono" style={{ fontWeight: 800, fontSize: '0.82rem' }}>{c.contrato}</td>
                    <td>
                      {provider ? (
                        <>
                          <div className="provider-name">{provider.nombre || '—'}</div>
                          <div className="provider-rfc">RFC: {provider.rfc || '—'}</div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                          <VinculoBadge tipo={c.tipoVinculacion} />
                        </span>
                      )}
                      {pcomRows.length > 0 && (
                        <div className="claves-badge" style={{ marginTop: 4, display: 'inline-flex' }}>
                          📋 {pcomRows.length} folios ▶
                        </div>
                      )}
                    </td>
                    <td className="num white" style={{ fontWeight: 700 }}>{c.renglonesPCOM || '—'}</td>
                    <td className="num">{fmt$(c.modificadoSICOP)}</td>
                    <td className="num">{fmt$(c.modificadoINPer)}</td>
                    <td className={`num ${Math.abs(difModif) < 0.05 ? '' : difModif < 0 ? 'red' : 'green'}`}>{fmt$(difModif)}</td>
                    <td className="num">{fmt$(c.ejercidoSICOP)}</td>
                    <td className="num">{fmt$(c.pagadoINPer)}</td>
                    <td className="num cyan">{c.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? <span style={{ color: 'var(--yellow)' }}>N/D</span> : fmt$(c.disponibleSICOP)}</td>
                    <td className="num purple">{fmt$(c.estimacionINPer)}</td>
                    <td className={`num ${c.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? '' : saldoClass(c.saldo)}`} style={{ fontWeight: 800 }}>
                      {c.estatus === 'PENDIENTE VINCULACIÓN SICOP' ? <span style={{ color: 'var(--muted)' }}>—</span> : fmt$(c.saldo)}
                    </td>
                    <td><StatusBadge estatus={c.estatus} /></td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {c.coberturaPorc !== null ? fmtPct(c.coberturaPorc) : 'N/D'}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${c.contrato}-det`}>
                      <td colSpan={14} style={{ padding: 0 }}>
                        <PCOMDetail contrato={c.contrato} pcomRows={pcomRows} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontWeight: 600 }}>Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Anterior</button>
          <span className="page-info">Página {page + 1} de {totalPages} · {filtered.length} contratos</span>
          <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      )}

      {/* Status summary badges */}
      {!filterEstatus && (
        <div style={{ display: 'flex', gap: 12, padding: '8px 20px 20px', flexWrap: 'wrap' }}>
          {Object.entries(countByStatus).map(([e, n]) => (
            <span key={e} className={`status-pill ${e === 'SOBRA RECURSO' ? 'pill-green' : e === 'FALTA RECURSO' ? 'pill-red' : e === 'EQUILIBRADO' ? 'pill-yellow' : 'pill-gray'}`} style={{ cursor: 'pointer' }} onClick={() => { setFilter(e as FilterKey); setPage(0); }}>
              {e}: {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PCOMDetail({ contrato, pcomRows }: { contrato: string; pcomRows: PCOMRow[] }) {
  return (
    <div className="pcom-detail">
      <div className="pcom-detail-title">Desglose PCOM → Contrato <span style={{ color: 'var(--cyan)' }}>{contrato}</span></div>
      {pcomRows.length === 0 ? (
        <p style={{ color: 'var(--yellow)', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Sin líneas PCOM vinculadas — PENDIENTE VINCULACIÓN SICOP</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ fontSize: '0.76rem' }}>
            <thead>
              <tr>
                <th>NO_COMPROMISO</th>
                <th>CTOEXT</th>
                <th className="num">Comprometido</th>
                <th className="num">Modificado</th>
                <th className="num">Ejercido</th>
                <th className="num cyan">Disponible</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {pcomRows.map((p, i) => (
                <tr key={i}>
                  <td className="font-mono" style={{ color: 'var(--muted)' }}>{String(p.NO_COMPROMISO)}</td>
                  <td className="font-mono white">{String(p.CTOEXT)}</td>
                  <td className="num">{fmt$(p.COMPROMISO as number)}</td>
                  <td className="num">{fmt$(p.MODIFICADO as number)}</td>
                  <td className="num">{fmt$(p.EJERCIDO as number)}</td>
                  <td className="num cyan">{fmt$(p.DISPONIBLE as number)}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(p.NOMBRE_PROVEEDOR ?? '—')}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border2)', fontWeight: 800 }}>
                <td colSpan={2} style={{ color: 'var(--white)' }}>TOTAL ({pcomRows.length} líneas)</td>
                <td className="num">{fmt$(pcomRows.reduce((s, p) => s + (p.COMPROMISO as number || 0), 0))}</td>
                <td className="num">{fmt$(pcomRows.reduce((s, p) => s + (p.MODIFICADO as number || 0), 0))}</td>
                <td className="num">{fmt$(pcomRows.reduce((s, p) => s + (p.EJERCIDO as number || 0), 0))}</td>
                <td className="num cyan">{fmt$(pcomRows.reduce((s, p) => s + (p.DISPONIBLE as number || 0), 0))}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
