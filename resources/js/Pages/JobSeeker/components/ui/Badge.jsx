export default function Badge({ children, tone = "default" }) {
  const tones = {
    default: "bg-slate-100 text-slate-600",
    info: "bg-[#FFF6E0] text-neutral-900",
    success: "bg-[#FFF3D6] text-neutral-900 font-semibold",
    warning: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
}
