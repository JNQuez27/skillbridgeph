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

export default function SkillBridgePage({ initialView = "general-dashboard", initialRole = "jobseeker", requiresAuth = false }) {
  const [view, setView] = useState(initialView);
  const [role, setRole] = useState(initialRole);
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState());
  const [session, setSession] = useState(getSession());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      case 'jobseeker-dashboard':
        return <UserProfile />;
      case 'browse-jobs':
        return <BrowseJobs />;
      case 'employer-dashboard':
        return <EmployerDashboard />;
      case 'architecture':
        return <ArchitectureView />;
      default:
        // Default to the appropriate dashboard based on role
        return role === 'employer' ? <EmployerDashboard /> : <UserProfile />;
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
            {[
              "Home",
              "Process",
              "Industry",
              "Benefit",
              "Testimonial",
              "FAQs",
              "Messages",
              "Notifications",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
          {isAuthenticated ? (
            <div
              data-user-menu
              style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: `1px solid ${COLORS.parchmentDeep}`,
                  background: COLORS.brownDeep,
                  color: COLORS.cream,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {getAvatarLabel()}
              </button>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.brownDeep,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {getDisplayName()}
              </div>
              {isMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    minWidth: 160,
                    background: COLORS.cream,
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    borderRadius: 12,
                    boxShadow: "0 14px 30px rgba(82, 64, 39, 0.15)",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    zIndex: 10,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleViewChange("settings")}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: COLORS.brownDeep,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      border: "none",
                      background: COLORS.brownDeep,
                      color: COLORS.cream,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
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
