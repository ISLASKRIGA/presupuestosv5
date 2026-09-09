interface Props {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export default function KPICard({ label, value, sub, color = 'text-gray-900' }: Props) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}
