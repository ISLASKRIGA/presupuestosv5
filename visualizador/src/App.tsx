import { useState, useEffect } from 'react';
import type { AppData, ContratoMaestro, ControlValidacion, INPerRow, PCOMRow, ResumenEstatus } from './types';
import { reconcile } from './engine/reconciliation';
import Dashboard from './components/Dashboard';
import ContractTable from './components/ContractTable';
import ControlCalidad from './components/ControlCalidad';
import FileUpload from './components/FileUpload';
import './index.css';

type Tab = 'dashboard' | 'conciliacion' | 'falta' | 'sobra' | 'pendientes' | 'control' | 'nuevo_corte';

function mapMaestra(raw: Record<string, unknown>[]): ContratoMaestro[] {
  return raw.map(r => ({
    contrato:        String(r['Contrato'] ?? ''),
    contratoPCOM:    String(r['Contrato PCOM'] ?? ''),
    tipoVinculacion: String(r['Tipo de vinculación'] ?? 'SIN VINCULACIÓN'),
    comprometidoSICOP: Number(r['Comprometido SICOP (PCOM)'] ?? 0),
    modificadoSICOP:   Number(r['Modificado SICOP (PCOM)'] ?? 0),
    ejercidoSICOP:     Number(r['Ejercido/Pagado SICOP (PCOM)'] ?? 0),
    disponibleSICOP:   Number(r['Disponible SICOP (PCOM)'] ?? 0),
    modificadoINPer:   Number(r['Modificado INPer'] ?? 0),
    pagadoINPer:       Number(r['Pagado INPer'] ?? 0),
    montoEjercerINPer: Number(r['Monto por ejercer INPer'] ?? 0),
    estimacionINPer:   Number(r['Estimación INPer por ejercer'] ?? 0),
    saldo:             Number(r['Saldo de suficiencia'] ?? 0),
    estatus: String(r['Estatus'] ?? 'PENDIENTE VINCULACIÓN SICOP') as ContratoMaestro['estatus'],
    coberturaPorc: r['Cobertura %'] != null && r['Cobertura %'] !== '' ? Number(r['Cobertura %']) : null,
    renglonesPCOM:  Number(r['Renglones PCOM'] ?? 0),
    renglomesINPer: Number(r['Renglones INPer'] ?? 0),
  }));
}

function mapResumen(raw: Record<string, unknown>[]): ResumenEstatus[] {
  return raw.map(r => ({
    estatus:        String(r['Estatus'] ?? '') as ResumenEstatus['estatus'],
    contratos:      Number(r['Contratos'] ?? 0),
    disponibleSICOP:Number(r['Disponible_SICOP'] ?? 0),
    estimacionINPer:Number(r['Estimacion_INPer'] ?? 0),
    saldo:          Number(r['Saldo'] ?? 0),
  }));
}

export default function App() {
  const [tab, setTab]         = useState<Tab>('dashboard');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [pcomMap, setPcomMap] = useState<Map<string, PCOMRow[]>>(new Map());
  const [inperRows, setInperRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [rM, rR, rP, rI, rC] = await Promise.all([
          fetch('/data/data_maestra.json').then(r => r.json()),
          fetch('/data/data_resumen.json').then(r => r.json()),
          fetch('/data/data_pcom.json').then(r => r.json()),
          fetch('/data/data_inper.json').then(r => r.json()),
          fetch('/data/data_control.json').then(r => r.json()),
        ]);

        const maestra: ContratoMaestro[]  = mapMaestra(rM);
        const resumen: ResumenEstatus[]   = mapResumen(rR);
        const pcom:    PCOMRow[]          = rP;
        const inper:   INPerRow[]         = rI;
        const control: ControlValidacion[]= rC;

        const map = new Map<string, PCOMRow[]>();
        for (const c of maestra) {
          if (!c.contratoPCOM) continue;
          const rows = pcom.filter(p => (p.CTOEXT ?? '').toString().trim() === c.contratoPCOM);
          if (rows.length) map.set(c.contrato, rows);
        }
        setPcomMap(map);
        setInperRows(rI as Record<string, unknown>[]);
        setAppData({ maestra, resumen, pcom, inper, pendientes: maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP'), control, corte: '09-SEP-2026' });
      } catch (e) { setError(String(e)); }
      finally    { setLoading(false); }
    }
    load();
  }, []);

  function handleNewCut(inperData: INPerRow[], pcomData: PCOMRow[], corte: string) {
    const { maestra, resumen, pcomPorContrato: newMap } = reconcile(inperData, pcomData);
    setPcomMap(newMap);
    setInperRows(inperData as unknown as Record<string, unknown>[]);
    setAppData(prev => ({
      maestra, resumen, pcom: pcomData, inper: inperData,
      pendientes: maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP'),
      control: prev?.control ?? [], corte,
    }));
    setTab('dashboard');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', fontWeight: 600 }}>Cargando datos de conciliación SICOP–INPer…</p>
      </div>
    </div>
  );

  if (error || !appData) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--red)', borderRadius: 12, padding: 32, maxWidth: 440, textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', fontWeight: 800, marginBottom: 8 }}>❌ Error al cargar datos</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{error}</p>
      </div>
    </div>
  );

  const pend  = appData.pendientes;
  const falta = appData.maestra.filter(c => c.estatus === 'FALTA RECURSO');
  const sobra = appData.maestra.filter(c => c.estatus === 'SOBRA RECURSO');

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <header className="header">
        {/* Brand */}
        <div className="header-brand">
          <span className="badge-inper">INPer FINANZAS</span>
          <div>
            <div className="header-title">Conciliación Financiera: SICOP vs. INPer</div>
            <div className="header-sub">Base Maestra Corregida — Visualizador Ejecutivo por Contrato · Corte: {appData.corte}</div>
          </div>
        </div>

        {/* Search */}
        <input
          className="search-bar"
          placeholder="🔍 Buscar por contrato, proveedor, folio, clave CNIS..."
          onChange={() => {}}
        />

        {/* Actions */}
        <div className="header-actions">
          <button className="btn btn-green" onClick={() => setTab('nuevo_corte')}>📋 Descargar Base Maestra (.xlsx)</button>
          <button className="btn btn-purple" onClick={() => setTab('nuevo_corte')}>📄 Descargar Reporte Ejecutivo (.xlsx)</button>
          <button className="btn btn-red" onClick={() => setTab('control')}>📄 Descargar PDF Membretado</button>
          <button className="btn btn-red" style={{ background: '#b91c1c' }} onClick={() => setTab('control')}>⚠️ Errores</button>
        </div>
      </header>

      {/* ── TABS ── */}
      <div className="tabs-row" style={{ paddingTop: 16 }}>
        <button className={`tab-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
          📋 Tablero Ejecutivo (Base Maestra Conciliada)
        </button>
        <button className={`tab-item ${tab === 'pendientes' ? 'active' : ''}`} onClick={() => setTab('pendientes')}>
          📌 Recursos Pendientes de Vinculación
          <span className="tab-badge purple">{pend.length}</span>
        </button>
        <button className={`tab-item ${tab === 'control' ? 'active' : ''}`} onClick={() => setTab('control')}>
          ⚠️ Registros que Requieren Revisión
          <span className="tab-badge orange">{falta.length}</span>
        </button>
        <button className={`tab-item ${tab === 'conciliacion' ? 'active' : ''}`} onClick={() => setTab('conciliacion')}>
          🔍 Conciliación Completa
          <span className="tab-badge">{appData.maestra.length}</span>
        </button>
        <button className={`tab-item ${tab === 'falta' ? 'active' : ''}`} onClick={() => setTab('falta')}>
          🔴 Falta Recurso
          <span className="tab-badge red">{falta.length}</span>
        </button>
        <button className={`tab-item ${tab === 'sobra' ? 'active' : ''}`} onClick={() => setTab('sobra')}>
          🟢 Sobra Recurso
          <span className="tab-badge">{sobra.length}</span>
        </button>
        <button className={`tab-item ${tab === 'nuevo_corte' ? 'active' : ''}`} onClick={() => setTab('nuevo_corte')}>
          📂 Nuevo corte
        </button>
      </div>

      {/* ── CONTENT ── */}
      {tab === 'dashboard' && <Dashboard data={appData} />}

      {tab === 'conciliacion' && (
        <ContractTable
          contracts={appData.maestra}
          pcomPorContrato={pcomMap}
          inperRows={inperRows}
          title="Conciliación por Contrato — Universo Completo"
        />
      )}

      {tab === 'falta' && (
        <ContractTable
          contracts={[...falta].sort((a, b) => a.saldo - b.saldo)}
          pcomPorContrato={pcomMap}
          inperRows={inperRows}
          filterEstatus="FALTA RECURSO"
          title={`🔴 Contratos con Falta de Recurso (${falta.length}) — ordenados por déficit`}
        />
      )}

      {tab === 'sobra' && (
        <ContractTable
          contracts={[...sobra].sort((a, b) => b.saldo - a.saldo)}
          pcomPorContrato={pcomMap}
          inperRows={inperRows}
          filterEstatus="SOBRA RECURSO"
          title={`🟢 Contratos con Sobra de Recurso (${sobra.length}) — ordenados por excedente`}
        />
      )}

      {tab === 'pendientes' && (
        <>
          <div style={{ margin: '0 20px 16px', padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid var(--yellow)', borderRadius: 10 }}>
            <p style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              {pend.length} contratos sin vínculo único con PCOM · Disponible SICOP: <strong>NO DETERMINADO</strong> · Exposición INPer:{' '}
              <strong style={{ color: 'var(--yellow)' }}>${pend.reduce((s, c) => s + c.estimacionINPer, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
          <ContractTable
            contracts={pend}
            pcomPorContrato={pcomMap}
            inperRows={inperRows}
            filterEstatus="PENDIENTE VINCULACIÓN SICOP"
            title="Contratos Pendientes de Vinculación SICOP"
          />
        </>
      )}

      {tab === 'control' && <ControlCalidad data={appData} />}
      {tab === 'nuevo_corte' && <FileUpload onLoad={handleNewCut} />}
    </div>
  );
}
