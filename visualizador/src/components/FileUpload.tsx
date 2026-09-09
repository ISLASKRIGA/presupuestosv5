import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { INPerRow, PCOMRow } from '../types';

interface Props {
  onLoad: (inper: INPerRow[], pcom: PCOMRow[], corte: string) => void;
}

export default function FileUpload({ onLoad }: Props) {
  const inperRef = useRef<File | null>(null);
  const pcomRef  = useRef<File | null>(null);

  async function handleProcess() {
    if (!inperRef.current || !pcomRef.current) { alert('Selecciona ambos archivos'); return; }
    try {
      const [a, b] = await Promise.all([inperRef.current.arrayBuffer(), pcomRef.current.arrayBuffer()]);
      const wbI = XLSX.read(a, { type: 'array' });
      const wbP = XLSX.read(b, { type: 'array' });
      const inperData = XLSX.utils.sheet_to_json<INPerRow>(wbI.Sheets[wbI.SheetNames[0]]);
      const pcomData  = XLSX.utils.sheet_to_json<PCOMRow>(wbP.Sheets[wbP.SheetNames[0]]);
      const corte = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      onLoad(inperData, pcomData, corte);
    } catch (e) { alert('Error: ' + String(e)); }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-card2)', border: '1px solid var(--border2)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--white)', fontFamily: 'inherit', fontSize: '0.8rem', width: '100%',
  };

  return (
    <div className="fade-up gap-y section-pad">
      <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--white)' }}>📂 Cargar nuevo corte</h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
        Sube la base INPer vigente y el archivo PCOM/SICOP vigente. La metodología se aplica automáticamente.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 720 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--cyan)', borderRadius: 10, padding: 18 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--cyan)', marginBottom: 10 }}>
            📋 Base INPer (.xlsx)
          </label>
          <input type="file" accept=".xlsx,.xls" style={inputStyle} onChange={e => { inperRef.current = e.target.files?.[0] ?? null; }} />
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--purple)', borderRadius: 10, padding: 18 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 10 }}>
            📊 PCOM / SICOP (.xlsx)
          </label>
          <input type="file" accept=".xlsx,.xls" style={inputStyle} onChange={e => { pcomRef.current = e.target.files?.[0] ?? null; }} />
        </div>
      </div>

      <button onClick={handleProcess} className="btn btn-blue" style={{ alignSelf: 'flex-start', padding: '10px 24px', fontSize: '0.85rem' }}>
        ⚡ Procesar conciliación
      </button>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--blue)', borderRadius: 10, padding: 18, maxWidth: 720 }}>
        <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--blue)', textTransform: 'uppercase', marginBottom: 10 }}>📌 Metodología aplicada</p>
        <ul style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 2, paddingLeft: 20 }}>
          <li>Unidad de análisis: CONTRATO (no partida)</li>
          <li>Vinculación: exacta → normalizada (CM1/CM2) → ambigua/sin vínculo</li>
          <li>No se suman importes repetidos por partida</li>
          <li>No se fuerza SICOP = 0 para contratos no vinculados</li>
          <li>Saldo = Disponible SICOP − Estimación INPer por ejercer</li>
        </ul>
      </div>
    </div>
  );
}
