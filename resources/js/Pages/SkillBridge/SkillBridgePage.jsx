import { useEffect, useState } from "react";
import { getAuthState, setAuthState } from "../JobSeeker/hooks/useAuth";
import { getSession } from "../JobSeeker/hooks/useSession";
import { COLORS } from "./styles/theme";
import { globalStyles } from "./styles/globalStyles";
import Landing from "./views/Landing";
import GeneralDashboard from "./views/GeneralDashboard";
import BrowseJobs from "./views/BrowseJobs";
import UserProfile from "./views/UserProfile";
import EmployerDashboard from "./views/EmployerDashboard";
import ArchitectureView from "./views/ArchitectureView";
import {
  IconZap,
  IconBriefcase,
  IconTarget,
  IconClipboardCheck,
  IconSettings,
  IconLogout,
} from "./components/Icons";

export default function SkillBridgePage({ initialView = "general-dashboard", initialRole = "jobseeker", requiresAuth = false }) {
  const [view, setView] = useState(initialView);
  const [role, setRole] = useState(initialRole);
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState());
  const [session, setSession] = useState(getSession());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [accountTab, setAccountTab] = useState("skills");

  // Jobseeker account sections — surfaced from the profile menu (not the top nav).
  const accountSections = [
    { key: "skills", label: "Skills", Icon: IconZap },
    { key: "portfolio", label: "Portfolio", Icon: IconBriefcase },
    { key: "matches", label: "Matches", Icon: IconTarget },
    { key: "assessments", label: "Assessment", Icon: IconClipboardCheck },
  ];

  const openAccountSection = (tab) => {
    setAccountTab(tab);
    setView("jobseeker-dashboard");
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setView(initialView);
    setRole(initialRole);
  }, [initialView, initialRole]);

  useEffect(() => {
    if (!requiresAuth) return;
    if (!getAuthState()) {
      window.location.href = "/login";
    }
  }, [requiresAuth]);

  useEffect(() => {
    setIsAuthenticated(getAuthState());
  }, [view]);

  useEffect(() => {
    setSession(getSession());
  }, [isAuthenticated, view]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "jobseeker" && session?.applicantProfileComplete === false) {
      window.location.href = "/onboarding";
    }
  }, [isAuthenticated, role, session]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (event) => {
      if (!event.target.closest("[data-user-menu]")) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [isMenuOpen]);


  // Public dashboard nav — each item routes to a section on GeneralDashboard.
  // Auth-only items (Messages, Notifications) are excluded since those sections
  // do not exist on the public dashboard.
  const publicNavLinks = [
    { label: "Home", target: "home" },
    { label: "Process", target: "process" },
    { label: "Industry", target: "industry" },
    { label: "Benefit", target: "benefit" },
    { label: "Testimonial", target: "testimonial" },
    { label: "FAQs", target: "faqs" },
  ];

  const scrollToSection = (event, target) => {
    event.preventDefault();
    const el = document.getElementById(target);
    if (el) {
      setActiveSection(target);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Section only exists on the public dashboard — route there with the hash.
      window.location.href = `/#${target}`;
    }
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
  }, [view, isAuthenticated]);

  const handleViewChange = (newView) => {
    if (newView === 'landing') {
      window.location.href = '/';
    } else {
      setView(newView);
    }
  };

  const handleLogout = () => {
    setAuthState(false);
    window.localStorage.removeItem("sbph-session");
    setIsAuthenticated(false);
    setSession(getSession());
    window.location.href = "/";
  };

  const getNameParts = () => {
    const rawName = typeof session?.name === "string" ? session.name.trim().replace(/\s+/g, " ") : "";
    const nameParts = rawName ? rawName.split(" ") : [];
    const fallbackFirst = nameParts[0] || "";
    const fallbackSurname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
    const firstName = (session?.firstName || fallbackFirst || "").trim();
    const surname = (session?.surname || fallbackSurname || "").trim();
    return { firstName, surname, rawName };
  };

  const getDisplayName = () => {
    const { firstName, surname, rawName } = getNameParts();
    const shortFirst = firstName ? firstName.slice(0, 3) : "";
    const displayName = [shortFirst, surname].filter(Boolean).join(" ").trim();
    return displayName || rawName || "User";
  };

  const getAvatarLabel = () => {
    const { firstName, surname, rawName } = getNameParts();
    const letter = firstName[0] || surname[0] || rawName[0] || "U";
    return letter.toUpperCase();
  };

  const ActiveView = () => {
    if (!isAuthenticated) {
      switch (view) {
        case 'features':
          return <BrowseJobs />; // Placeholder for features view
        case 'architecture':
          return <ArchitectureView />;
        case 'overview':
        default:
          return <GeneralDashboard />;
      }
    }

    // Authenticated users
    switch (view) {
      case 'general-dashboard':
      case 'overview':
        return <GeneralDashboard />;
      case 'jobseeker-dashboard':
        return <UserProfile activeTab={accountTab} onTabChange={setAccountTab} />;
      case 'browse-jobs':
        return <BrowseJobs />;
      case 'employer-dashboard':
        return <EmployerDashboard />;
      case 'architecture':
        return <ArchitectureView />;
      default:
        // Default to the appropriate dashboard based on role
        return role === 'employer' ? <EmployerDashboard /> : <UserProfile activeTab={accountTab} onTabChange={setAccountTab} />;
    }
  };

  if (view === 'landing') {
    return <Landing onPickRole={setRole} />;
  }

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          width: "100%",
        }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: COLORS.brownDeep,
              cursor: "pointer",
            }}
            onClick={() => handleViewChange("landing")}
          >
            SkillBridge PH
          </div>
          <nav style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 12,
            fontWeight: 600,
            color: COLORS.textMid,
            flexWrap: "wrap",
            flex: 1,
            justifyContent: "center",
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
            <div
              data-user-menu
              style={{ position: "relative" }}
            >
              <button
                type="button"
                className="sbph-usertrigger"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: COLORS.brownDeep,
                }}>
                  {getDisplayName()}
                </span>
                <span style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}>
                  {getAvatarLabel()}
                </span>
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    minWidth: 220,
                    background: "#fff",
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    borderRadius: 14,
                    boxShadow: "0 18px 40px rgba(11, 29, 58, 0.16)",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    zIndex: 10,
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
                        const isActive = view === "jobseeker-dashboard" && accountTab === key;
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
                  <button
                    type="button"
                    role="menuitem"
                    className="sbph-menu-item"
                    onClick={() => handleViewChange("settings")}
                  >
                    <IconSettings size={16} />
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sbph-menu-item sbph-menu-item--danger"
                    onClick={handleLogout}
                  >
                    <IconLogout size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a
                href="/login"
                style={{
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: COLORS.brownDeep,
                  border: `1px solid ${COLORS.parchmentDeep}`,
                }}
              >
                Sign in
              </a>
              <a
                href="/signup"
                style={{
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: COLORS.cream,
                  background: COLORS.brownDeep,
                }}
              >
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
