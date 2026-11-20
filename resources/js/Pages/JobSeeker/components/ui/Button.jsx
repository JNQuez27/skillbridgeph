export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const base = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2";
  const variants = {
    primary: "bg-[#ECA406] text-neutral-900 hover:bg-[#D69405]",
    secondary: "bg-white text-neutral-900 border border-[#F3D89B] hover:bg-[#FFF6E0]",
    ghost: "bg-transparent text-neutral-700 hover:bg-[#FFF6E0]",
  };
  const isDisabled = disabled || loading;

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-neutral-900/40 border-t-neutral-900" />
      )}
      {children}
    </button>
  );
}
