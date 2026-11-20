export default function ProgressBar({ value }) {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-[#ECA406] to-[#ECA406] transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
