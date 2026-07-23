import { useEffect, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import { COLORS } from "./styles/theme";
import { globalStyles } from "./styles/globalStyles";
import GeneralDashboard from "./views/GeneralDashboard";
import UserProfile from "./views/UserProfile";
import EmployerDashboard from "./views/EmployerDashboard";
import {
  IconZap,
  IconBriefcase,
  IconTarget,
  IconClipboardCheck,
  IconSettings,
  IconLogout,
} from "./components/Icons";

export default function SkillBridgePage() {
  const { props } = usePage();
  const user = props.auth?.user || null;
  const account = props.account || null;
  const isAuthenticated = !!user;
  const role = user?.role || "jobseeker";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [accountTab, setAccountTab] = useState("skills");

  const publicNavLinks = [
    { label: "Home", target: "home" },
    { label: "Process", target: "process" },
    { label: "Industry", target: "industry" },
    { label: "Benefit", target: "benefit" },
    { label: "Testimonial", target: "testimonial" },
    { label: "FAQs", target: "faqs" },
  ];

  const accountSections = [
    { key: "skills", label: "Skills", Icon: IconZap },
    { key: "portfolio", label: "Portfolio", Icon: IconBriefcase },
    { key: "matches", label: "Matches", Icon: IconTarget },
    { key: "assessments", label: "Assessment", Icon: IconClipboardCheck },
  ];

  const scrollToSection = (event, target) => {
    event.preventDefault();
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Section only exists on the public dashboard — route there with the hash.
      window.location.href = `/#${target}`;
    }
  };

  const openAccountSection = (tab) => {
    setAccountTab(tab);
    setIsMenuOpen(false);
    if (!account) router.visit("/dashboard");
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    router.post("/logout");
  };

  // Scroll-spy: highlight the nav item whose section is currently in view.
  useEffect(() => {
    const els = publicNavLinks
      .map((link) => document.getElementById(link.target))
      .filter(Boolean);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [account]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (event) => {
      if (!event.target.closest("[data-user-menu]")) setIsMenuOpen(false);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isMenuOpen]);

  const getDisplayName = () => {
    const first = user?.firstName || (user?.name || "").split(" ")[0] || "";
    const surname = user?.surname || "";
    const short = first ? first.slice(0, 3) : "";
    return [short, surname].filter(Boolean).join(" ").trim() || user?.name || "User";
  };

  const getAvatarLabel = () => (user?.firstName?.[0] || user?.name?.[0] || "U").toUpperCase();

  const ActiveView = () => {
    if (!account) return <GeneralDashboard />;
    if (account.role === "employer") return <EmployerDashboard account={account} />;
    return <UserProfile account={account} activeTab={accountTab} onTabChange={setAccountTab} />;
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{globalStyles}</style>

      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: COLORS.cream,
        borderBottom: `1px solid ${COLORS.parchmentDeep}`,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        height: 64,
        transition: "background 0.3s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", width: "100%",
        }}>
          <div
            style={{
              fontSize: 18, fontWeight: 800, letterSpacing: "0.08em",
              textTransform: "uppercase", color: COLORS.brownDeep, cursor: "pointer",
            }}
            onClick={() => router.visit("/")}
          >
            SkillBridge PH
          </div>
          <nav style={{
            display: "flex", alignItems: "center", gap: 18, fontSize: 12,
            fontWeight: 600, color: COLORS.textMid, flexWrap: "wrap", flex: 1, justifyContent: "center",
          }}>
            {publicNavLinks.map((item) => (
              <a
                key={item.label}
                href={`#${item.target}`}
                onClick={(event) => scrollToSection(event, item.target)}
                className={`sbph-nav-link${activeSection === item.target ? " active" : ""}`}
                aria-current={activeSection === item.target ? "true" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          {isAuthenticated ? (
            <div data-user-menu style={{ position: "relative" }}>
              <button
                type="button"
                className="sbph-usertrigger"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep }}>
                  {getDisplayName()}
                </span>
                <span style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {getAvatarLabel()}
                </span>
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: 220,
                    background: "#fff", border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 14,
                    boxShadow: "0 18px 40px rgba(11, 29, 58, 0.16)", padding: 8,
                    display: "flex", flexDirection: "column", gap: 2, zIndex: 10,
                  }}
                >
                  <div style={{ padding: "8px 12px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep }}>{getDisplayName()}</div>
                    <div style={{ fontSize: 11, color: COLORS.textLight, textTransform: "capitalize" }}>
                      {role === "employer" ? "Employer account" : "Applicant account"}
                    </div>
                  </div>
                  {role !== "employer" && (
                    <>
                      <div style={{ height: 1, background: COLORS.parchmentDeep, margin: "2px 6px 6px" }} />
                      {accountSections.map(({ key, label, Icon }) => {
                        const isActive = !!account && account.role !== "employer" && accountTab === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            role="menuitem"
                            className={`sbph-menu-item${isActive ? " active" : ""}`}
                            onClick={() => openAccountSection(key)}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        );
                      })}
                    </>
                  )}
                  <div style={{ height: 1, background: COLORS.parchmentDeep, margin: "6px 6px" }} />
                  <button type="button" role="menuitem" className="sbph-menu-item" onClick={() => router.visit("/dashboard")}>
                    <IconSettings size={16} />
                    Settings
                  </button>
                  <button type="button" role="menuitem" className="sbph-menu-item sbph-menu-item--danger" onClick={handleLogout}>
                    <IconLogout size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a href="/login" style={{
                textDecoration: "none", padding: "8px 14px", borderRadius: 999, fontSize: 11,
                fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: COLORS.brownDeep, border: `1px solid ${COLORS.parchmentDeep}`,
              }}>
                Sign in
              </a>
              <a href="/signup" style={{
                textDecoration: "none", padding: "8px 14px", borderRadius: 999, fontSize: 11,
                fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: COLORS.cream, background: COLORS.brownDeep,
              }}>
                Sign up
              </a>
            </div>
          )}
        </div>
      </nav>

      <main style={{ minHeight: "calc(100vh - 64px)" }}>
        <ActiveView />
      </main>
    </div>
  );
}
