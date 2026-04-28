import Card from "../ui/Card";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 rounded-full bg-amber-200/40 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-5xl flex-col gap-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-600">SkillBridge PH</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-slate-600 md:text-base">{subtitle}</p>}
        </div>
        <div className="mx-auto w-full max-w-lg">
          <Card className="border-emerald-100/70 bg-white/95 shadow-lg shadow-emerald-100/60 backdrop-blur">
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}
