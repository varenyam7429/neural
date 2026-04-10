export default function MetricCard({ label, value, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{label}</p>
      <p className="font-['Outfit'] font-black text-2xl md:text-3xl">{value}</p>
    </div>
  );
}
