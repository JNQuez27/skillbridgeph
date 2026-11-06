export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const base = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-sky-700 text-white hover:bg-sky-800 focus:ring-sky-400",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-sky-50 focus:ring-sky-300",
    ghost: "bg-transparent text-slate-600 hover:bg-sky-50 focus:ring-sky-200",
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
