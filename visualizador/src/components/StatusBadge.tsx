import { statusClass } from '../utils/format';

export default function StatusBadge({ estatus }: { estatus: string }) {
  return (
    <span className={`status-badge ${statusClass(estatus)}`}>
      {estatus}
    </span>
  );
}
