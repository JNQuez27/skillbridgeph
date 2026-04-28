export default function Input({
  id,
  label,
  error,
  hint,
  rightSlot,
  className = "",
  ...props
}) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm text-slate-600" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          id={id}
          className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 ${rightSlot ? "pr-12" : ""} ${className}`}
          {...props}
        />
        {rightSlot && <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>}
      </div>
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </label>
  );
}
