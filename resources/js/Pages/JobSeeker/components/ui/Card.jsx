export default function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
