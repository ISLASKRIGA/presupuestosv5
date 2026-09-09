import { useState, useEffect } from 'react';
import type { AppData, ContratoMaestro, ControlValidacion, INPerRow, PCOMRow, ResumenEstatus } from './types';
import { reconcile } from './engine/reconciliation';
import Dashboard from './components/Dashboard';
import ContractTable from './components/ContractTable';
import ControlCalidad from './components/ControlCalidad';
import FileUpload from './components/FileUpload';
import './index.css';

type Tab = 'dashboard' | 'conciliacion' | 'falta' | 'sobra' | 'pendientes' | 'control' | 'nuevo_corte';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Resumen ejecutivo' },
  { id: 'conciliacion', label: 'Conciliación por contrato' },
  { id: 'falta', label: 'Falta recurso' },
  { id: 'sobra', label: 'Sobra recurso' },
  { id: 'pendientes', label: 'Pendientes vinculación' },
  { id: 'control', label: 'Control de calidad' },
  { id: 'nuevo_corte', label: '+ Nuevo corte' },
];

function mapMaestra(raw: Record<string, unknown>[]): ContratoMaestro[] {
  return raw.map(r => ({
    contrato: String(r['Contrato'] ?? ''),
    contratoPCOM: String(r['Contrato PCOM'] ?? ''),
    tipoVinculacion: String(r['Tipo de vinculación'] ?? 'SIN VINCULACIÓN'),
    comprometidoSICOP: Number(r['Comprometido SICOP (PCOM)'] ?? 0),
    modificadoSICOP: Number(r['Modificado SICOP (PCOM)'] ?? 0),
    ejercidoSICOP: Number(r['Ejercido/Pagado SICOP (PCOM)'] ?? 0),
    disponibleSICOP: Number(r['Disponible SICOP (PCOM)'] ?? 0),
    modificadoINPer: Number(r['Modificado INPer'] ?? 0),
    pagadoINPer: Number(r['Pagado INPer'] ?? 0),
    montoEjercerINPer: Number(r['Monto por ejercer INPer'] ?? 0),
    estimacionINPer: Number(r['Estimación INPer por ejercer'] ?? 0),
    saldo: Number(r['Saldo de suficiencia'] ?? 0),
    estatus: String(r['Estatus'] ?? 'PENDIENTE VINCULACIÓN SICOP') as ContratoMaestro['estatus'],
    coberturaPorc: r['Cobertura %'] != null && r['Cobertura %'] !== '' ? Number(r['Cobertura %']) : null,
    renglonesPCOM: Number(r['Renglones PCOM'] ?? 0),
    renglomesINPer: Number(r['Renglones INPer'] ?? 0),
  }));
}

function mapResumen(raw: Record<string, unknown>[]): ResumenEstatus[] {
  return raw.map(r => ({
    estatus: String(r['Estatus'] ?? '') as ResumenEstatus['estatus'],
    contratos: Number(r['Contratos'] ?? 0),
    disponibleSICOP: Number(r['Disponible_SICOP'] ?? 0),
    estimacionINPer: Number(r['Estimacion_INPer'] ?? 0),
    saldo: Number(r['Saldo'] ?? 0),
  }));
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [appData, setAppData] = useState<AppData | null>(null);
  const [pcomPorContrato, setPcomPorContrato] = useState<Map<string, PCOMRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [rMaestra, rResumen, rPcom, rInper, rControl] = await Promise.all([
          fetch('/data/data_maestra.json').then(r => r.json()),
          fetch('/data/data_resumen.json').then(r => r.json()),
          fetch('/data/data_pcom.json').then(r => r.json()),
          fetch('/data/data_inper.json').then(r => r.json()),
          fetch('/data/data_control.json').then(r => r.json()),
        ]);

        const maestra = mapMaestra(rMaestra);
        const resumen = mapResumen(rResumen);
        const pcom: PCOMRow[] = rPcom;
        const inper: INPerRow[] = rInper;
        const control: ControlValidacion[] = rControl;

        const pcomMap = new Map<string, PCOMRow[]>();
        for (const c of maestra) {
          if (!c.contratoPCOM) continue;
          const rows = pcom.filter(p =>
            (p.CTOEXT ?? '').toString().trim() === c.contratoPCOM
          );
          if (rows.length > 0) pcomMap.set(c.contrato, rows);
        }
        setPcomPorContrato(pcomMap);

        setAppData({
          maestra,
          resumen,
          pcom,
          inper,
          pendientes: maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP'),
          control,
          corte: '09-SEP-2026',
        });
      } catch (e) {
        setError('Error al cargar los datos: ' + String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleNewCut(inperRows: INPerRow[], pcomRows: PCOMRow[], corte: string) {
    const { maestra, resumen, pcomPorContrato: newPcomMap } = reconcile(inperRows, pcomRows);
    setPcomPorContrato(newPcomMap);
    setAppData(prev => ({
      maestra,
      resumen,
      pcom: pcomRows,
      inper: inperRows,
      pendientes: maestra.filter(c => c.estatus === 'PENDIENTE VINCULACIÓN SICOP'),
      control: prev?.control ?? [],
      corte,
    }));
    setTab('dashboard');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Cargando datos de conciliación SICOP–INPer…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="card p-8 max-w-md text-center space-y-3">
          <p className="text-red-600 font-semibold">Error al cargar datos</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!appData) return null;

  const vinculados = appData.maestra.filter(c => c.estatus !== 'PENDIENTE VINCULACIÓN SICOP');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003B73] text-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#003B73] font-bold text-lg shrink-0">
            IN
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">Visualizador SICOP–INPer</h1>
            <p className="text-blue-200 text-xs">
              Instituto Nacional de Perinatología · Conciliación presupuestal · Corte: {appData.corte}
            </p>
          </div>
          <div className="ml-auto flex gap-6 text-right shrink-0">
            <div>
              <p className="text-2xl font-bold font-mono">{appData.maestra.length}</p>
              <p className="text-blue-300 text-xs">contratos</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-green-300">{vinculados.length}</p>
              <p className="text-blue-300 text-xs">vinculados</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-amber-300">{appData.pendientes.length}</p>
              <p className="text-blue-300 text-xs">pendientes</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#003B73] text-[#003B73] font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {tab === 'dashboard' && <Dashboard data={appData} />}

        {tab === 'conciliacion' && (
          <ContractTable
            contracts={appData.maestra}
            pcomPorContrato={pcomPorContrato}
            title="Conciliación por Contrato — Universo Completo"
          />
        )}

        {tab === 'falta' && (
          <ContractTable
            contracts={[...appData.maestra]
              .filter(c => c.estatus === 'FALTA RECURSO')
              .sort((a, b) => a.saldo - b.saldo)}
            pcomPorContrato={pcomPorContrato}
            filterEstatus="FALTA RECURSO"
            title="Contratos con Falta de Recurso (ordenados por déficit)"
          />
        )}

        {tab === 'sobra' && (
          <ContractTable
            contracts={[...appData.maestra]
              .filter(c => c.estatus === 'SOBRA RECURSO')
              .sort((a, b) => b.saldo - a.saldo)}
            pcomPorContrato={pcomPorContrato}
            filterEstatus="SOBRA RECURSO"
            title="Contratos con Sobra de Recurso (ordenados por excedente)"
          />
        )}

        {tab === 'pendientes' && (
          <div className="space-y-4">
            <div className="card p-4 bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800 font-semibold">
                ⚠ {appData.pendientes.length} contratos sin vínculo único con PCOM.
                Su disponible SICOP es <strong>NO DETERMINADO</strong>.
                Exposición INPer pendiente de conciliación:{' '}
                <strong>
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                    appData.pendientes.reduce((s, c) => s + c.estimacionINPer, 0)
                  )}
                </strong>
              </p>
            </div>
            <ContractTable
              contracts={appData.pendientes}
              pcomPorContrato={pcomPorContrato}
              filterEstatus="PENDIENTE VINCULACIÓN SICOP"
              title="Contratos Pendientes de Vinculación SICOP"
            />
          </div>
        )}

        {tab === 'control' && <ControlCalidad data={appData} />}

        {tab === 'nuevo_corte' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Cargar nuevo corte</h2>
              <p className="text-sm text-gray-500">
                Sustituye las fuentes vigentes para ejecutar la conciliación con datos actualizados.
                La metodología se aplica automáticamente.
              </p>
            </div>
            <FileUpload onLoad={handleNewCut} />
            <div className="card p-4 bg-blue-50 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Metodología aplicada</h4>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Unidad de análisis: CONTRATO (no partida)</li>
                <li>Vinculación: exacta → normalizada (CM1/CM2) → ambigua/sin vínculo</li>
                <li>No se suman importes repetidos por partida</li>
                <li>No se fuerza SICOP = 0 para contratos no vinculados</li>
                <li>Disponible SICOP fuente: PCOM vigente (campo DISPONIBLE)</li>
                <li>Saldo = Disponible SICOP − Estimación INPer por ejercer</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
