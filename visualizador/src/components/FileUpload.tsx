import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { INPerRow, PCOMRow } from '../types';

interface Props {
  onLoad: (inper: INPerRow[], pcom: PCOMRow[], corte: string) => void;
}

export default function FileUpload({ onLoad }: Props) {
  const inperRef = useRef<File | null>(null);
  const pcomRef = useRef<File | null>(null);

  async function readXlsx(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    return wb;
  }

  async function handleProcess() {
    if (!inperRef.current || !pcomRef.current) {
      alert('Selecciona ambos archivos primero');
      return;
    }
    try {
      const [wbInper, wbPcom] = await Promise.all([
        readXlsx(inperRef.current),
        readXlsx(pcomRef.current),
      ]);

      // INPer: first sheet
      const wsInper = wbInper.Sheets[wbInper.SheetNames[0]];
      const inperData = XLSX.utils.sheet_to_json<INPerRow>(wsInper);

      // PCOM: first sheet
      const wsPcom = wbPcom.Sheets[wbPcom.SheetNames[0]];
      const pcomData = XLSX.utils.sheet_to_json<PCOMRow>(wsPcom);

      const now = new Date();
      const corte = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

      onLoad(inperData, pcomData, corte);
    } catch (e) {
      alert('Error al leer los archivos: ' + String(e));
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <h3 className="font-semibold text-gray-700">Cargar nuevo corte</h3>
      <p className="text-xs text-gray-500">
        Sube el archivo INPer (base actual de contratos) y el archivo PCOM/SICOP vigente.
        El sistema aplicará la metodología de conciliación automáticamente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Base INPer (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => { inperRef.current = e.target.files?.[0] ?? null; }}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">PCOM / SICOP (.xlsx)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => { pcomRef.current = e.target.files?.[0] ?? null; }}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleProcess}
          className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Procesar conciliación
        </button>
        <span className="text-xs text-gray-400 self-center">
          Los archivos son procesados localmente, sin enviarse a ningún servidor.
        </span>
      </div>
    </div>
  );
}
