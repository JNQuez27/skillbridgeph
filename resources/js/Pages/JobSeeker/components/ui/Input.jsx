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
    <div className="flex w-full flex-col gap-2 text-sm text-neutral-700">
      <label className="font-semibold text-neutral-900" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className={`w-full min-h-11 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm transition focus:border-[#ECA406] focus:outline-none focus:ring-2 focus:ring-[#ECA406]/30 ${rightSlot ? "pr-12" : ""} ${className}`}
          {...props}
        />
        {rightSlot && <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>}
      </div>
      {hint && !error && <span className="text-xs text-neutral-500">{hint}</span>}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
}
