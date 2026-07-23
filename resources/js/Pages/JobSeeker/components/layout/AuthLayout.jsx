import Card from "../ui/Card";

const trustPoints = [
  "Verified skill badges, not just resumes",
  "Matched to real hiring demand across PH",
  "Apply and track responses in one place",
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full bg-sky-50 font-sans text-slate-800 md:grid md:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sky-900 via-sky-800 to-sky-600 p-10 text-white md:flex md:flex-col md:justify-between lg:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/4 rounded-full bg-green-400/20 blur-3xl" />
        </div>
        <a href="/" className="relative z-10 font-display text-lg font-bold uppercase tracking-[0.16em]">
          SkillBridge PH
        </a>
        <div className="relative z-10 max-w-sm">
          <h2 className="font-display text-3xl font-semibold leading-tight lg:text-4xl">
            Smart hiring starts with verified skills.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-sky-50">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white">
                  ✓
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-sky-200/80">
          Trusted by SMEs and enterprises nationwide.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center px-4 py-10 md:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center md:hidden">
            <a href="/" className="font-display text-base font-bold uppercase tracking-[0.16em] text-sky-800">
              SkillBridge PH
            </a>
          </div>
          <Card className="border-sky-100 bg-white shadow-xl shadow-sky-900/5">
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-semibold text-sky-900 md:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </Card>
        </div>
      </main>
    </div>
  );
}
