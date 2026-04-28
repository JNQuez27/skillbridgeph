import { useEffect, useMemo, useState } from "react";
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const session = useMemo(() => getSession(), []);
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

  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { key: "overview", label: "Overview" },
        { key: "features", label: "Features" },
        { key: "architecture", label: "System Design" },
      ];
    }

    if (role === "employer") {
      return [
        { key: "employer-dashboard", label: "Dashboard" },
        { key: "post-job", label: "Post a Job" },
        { key: "architecture", label: "System Design" },
      ];
    }

    // Default to jobseeker
    return [
      { key: "jobseeker-dashboard", label: "Dashboard" },
      { key: "browse-jobs", label: "Browse Jobs" },
      { key: "architecture", label: "System Design" },
    ];
  }, [isAuthenticated, role]);

  const handleViewChange = (newView) => {
    if (newView === 'landing') {
      window.location.href = '/';
    } else {
      setView(newView);
    }
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
        background: COLORS.brownDeep,
        borderBottom: `1px solid rgba(200,144,32,0.2)`,
        padding: "0 32px", display: "flex", alignItems: "center", height: 60,
        backdropFilter: "none",
        transition: "background 0.3s",
      }}>
        <button onClick={() => handleViewChange("landing")} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 600,
          color: COLORS.goldLight, letterSpacing: "0.06em", marginRight: 32
        }}>SkillBridge PH</button>
        <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              border: "none", cursor: "pointer",
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              color: view === item.key ? COLORS.goldLight : "rgba(253,246,232,0.6)",
              fontFamily: "'DM Sans', sans-serif",
              background: view === item.key ? "rgba(200,144,32,0.1)" : "transparent",
              transition: "all 0.2s"
            }}>{item.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!isAuthenticated ? (
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/login" style={{
                textDecoration: "none", padding: "6px 12px", borderRadius: 999,
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                color: COLORS.goldLight, border: "1px solid rgba(200,144,32,0.4)",
                fontFamily: "'DM Sans', sans-serif"
              }}>Login</a>
              <a href="/signup" style={{
                textDecoration: "none", padding: "6px 12px", borderRadius: 999,
                fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                color: COLORS.brownDeep, background: COLORS.goldLight,
                fontFamily: "'DM Sans', sans-serif"
              }}>Sign Up</a>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <button onClick={() => setProfileMenuOpen((prev) => !prev)} style={{
                width: 34, height: 34, borderRadius: "50%",
                border: "none",
                background: `linear-gradient(135deg, ${COLORS.rust}, ${COLORS.gold})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#FDF6E8", cursor: "pointer"
              }}>{initials}</button>
              {profileMenuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: 42, minWidth: 160,
                  background: COLORS.cream, border: `1px solid ${COLORS.parchmentDeep}`,
                  borderRadius: 12, padding: 8, boxShadow: "0 12px 24px rgba(30,14,4,0.12)",
                  display: "flex", flexDirection: "column", gap: 6
                }}>
                  <div style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.parchmentDeep}` }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: COLORS.textDark }}>{session?.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: COLORS.textMid }}>{role === 'jobseeker' ? 'Applicant' : 'Employer'}</p>
                  </div>
                  <button onClick={() => setView(role === 'employer' ? 'employer-dashboard' : 'jobseeker-dashboard')} style={{
                    border: "none", background: "transparent", textAlign: "left",
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: COLORS.textMid
                  }}>Dashboard</button>
                  <button onClick={() => {
                    setAuthState(false);
                    setIsAuthenticated(false);
                    setProfileMenuOpen(false);
                    window.location.href = "/";
                  }} style={{
                    border: "none", background: "transparent", textAlign: "left",
                    padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: COLORS.rust
                  }}>Sign Out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main style={{ minHeight: "calc(100vh - 60px)" }}>
        <ActiveView />
      </main>
    </div>
  );
}
