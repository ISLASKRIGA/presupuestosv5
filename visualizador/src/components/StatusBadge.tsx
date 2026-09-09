export default function StatusBadge({ estatus }: { estatus: string }) {
  const cls =
    estatus === 'SOBRA RECURSO'              ? 'pill-green'  :
    estatus === 'FALTA RECURSO'              ? 'pill-red'    :
    estatus === 'EQUILIBRADO'                ? 'pill-yellow' : 'pill-gray';

  return <span className={`status-pill ${cls}`}>{estatus}</span>;
}
