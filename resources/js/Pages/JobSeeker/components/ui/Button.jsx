export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50/40 focus:ring-emerald-300",
    ghost: "bg-transparent text-slate-600 hover:bg-emerald-50/40 focus:ring-emerald-200",
  };
  const isDisabled = disabled || loading;

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      )}
      {children}
    </button>
  );
}
