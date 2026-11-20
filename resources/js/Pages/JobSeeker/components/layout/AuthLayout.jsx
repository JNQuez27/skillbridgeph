import { Head } from "@inertiajs/react";

// Left-panel copy for each audience (reference design: amber panel, black text).
export const PANELS = {
  jobseeker: {
    eyebrow: ["Your skills.", "Your future."],
    headline: "You’re more than a résumé.",
    text: "Make your strengths visible to employers who value what you can do.",
    points: ["Verify your real-world skills", "Discover roles that fit you", "Apply with confidence"],
  },
  employer: {
    eyebrow: ["Hire for", "what matters."],
    headline: "Great teams start with real skills.",
    text: "Find talent with evidence, not assumptions.",
    points: ["Skill-based job requirements", "Candidates ranked by verified proof", "Clear evidence behind every match"],
  },
};

export default function AuthLayout({ title, subtitle, eyebrow = "Let’s get you started", top = null, panel = PANELS.jobseeker, children }) {
  return (
    <div className="min-h-screen w-full bg-[#FFF6E3] font-sans text-neutral-900">
      <Head title={title} />

      <header className="border-b border-[#F3D89B] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="font-display text-xl font-bold lowercase tracking-tight text-neutral-900">skillbridge</a>
          <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            <span className="hidden sm:inline">PH / Your next chapter</span>
            <a href="/" className="text-xs font-semibold normal-case tracking-normal text-neutral-900 hover:underline">← Home</a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:items-start md:gap-10 md:py-12">
        {/* Amber panel */}
        <aside className="rounded-3xl bg-[#ECA406] p-7 text-neutral-900 sm:p-9">
          <p className="text-xs font-bold uppercase leading-relaxed tracking-[0.12em]">
            {panel.eyebrow.map((line) => <span key={line} className="block">{line}</span>)}
          </p>
          <h2 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl">{panel.headline}</h2>
          <p className="mt-5 text-sm leading-relaxed sm:text-base">{panel.text}</p>
          <ul className="mt-6 hidden flex-col gap-4 text-sm sm:flex">
            {panel.points.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span aria-hidden="true" className="font-bold">→</span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-7 hidden rounded-2xl bg-white p-5 sm:block">
            <p className="font-display text-base font-bold">Skills first. People always.</p>
            <p className="mt-2 text-xs text-neutral-700">You choose when your personal details are shared.</p>
          </div>
        </aside>

        {/* Form card */}
        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-9">
          {top}
          {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{eyebrow}</p>}
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-neutral-900">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-neutral-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
