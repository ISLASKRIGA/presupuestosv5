interface Props {
  label: string;
  value: string;
  sub?: string;
  valueColor?: 'cyan' | 'purple' | 'red' | 'green' | 'yellow' | 'white';
  borderColor?: 'cyan' | 'purple' | 'red' | 'green' | 'yellow' | 'blue';
}

const BORDER_CLASS: Record<string, string> = {
  cyan: '', purple: 'purple-l', red: 'red-l', green: 'green-l', yellow: 'yellow-l', blue: 'blue-l',
};

export default function KPICard({ label, value, sub, valueColor = 'cyan', borderColor = 'cyan' }: Props) {
  return (
    <div className={`kpi-card ${BORDER_CLASS[borderColor] ?? ''}`}>
      <span className="kpi-label">{label}</span>
      <span className={`kpi-value ${valueColor}`}>{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}
