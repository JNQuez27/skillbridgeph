import { useMemo, useState } from "react";
import { useRequireAuth, useAuthState } from "../../hooks/useAuth";
import { useSessionState } from "../../hooks/useSession";

const navItems = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "profile", label: "Profile", href: "/profile" },
  { key: "onboarding", label: "Onboarding", href: "/onboarding" },
];

export default function AppLayout({ children, active = "dashboard" }) {
  useRequireAuth();
  const { signOut } = useAuthState();
  const [session] = useSessionState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = useMemo(() => {
    if (!session?.name) return "JS";
    return session.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [session]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-slate-200 bg-white px-6 py-6 transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">SkillBridge PH</p>
              <p className="text-lg font-semibold text-slate-900">Applicant</p>
            </div>
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(false)}
              type="button"
            >
              x
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active === item.key ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <span className="text-lg">{item.key === "dashboard" ? "🏠" : item.key === "profile" ? "👤" : "🧭"}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto pt-6 text-xs text-slate-400">Built for all applicants</div>
        </aside>

        <div className="flex w-full flex-col md:ml-64">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              menu
            </button>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-800">Welcome back</p>
              <p className="text-xs text-slate-500">Keep your profile up to date for better matches</p>
            </div>
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
                onClick={() => setMenuOpen((prev) => !prev)}
                type="button"
              >
                <span className="h-7 w-7 rounded-full bg-sky-200 text-center text-xs font-semibold text-sky-700">{initials}</span>
                {session?.name || "Applicant"}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
                  <a className="block rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100" href="/profile">Profile</a>
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      signOut();
                      window.location.href = "/login";
                    }}
                    type="button"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
