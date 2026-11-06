import { useEffect, useRef, useState } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import { COLORS } from "./styles/ui";
import { globalStyles } from "./styles/globalStyles";
import GeneralDashboard from "./views/GeneralDashboard";
import UserProfile from "./views/UserProfile";
import EmployerDashboard from "./views/EmployerDashboard";
import AdminDashboard from "./views/AdminDashboard";
import PublicJobs from "./views/PublicJobs";
import { IconUser, IconLogout, IconBell, IconSearch, IconAward, IconClipboardCheck } from "./components/Icons";

export default function SkillBridgePage() {
  const { props } = usePage();
  const user = props.auth?.user || null;
  const account = props.account || null;
  const isAuthenticated = !!user;
  const role = user?.role || "jobseeker";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  // Fig. 7, step 760: in-app notifications (status changes on applications).
  const notifications = props.notifications || { unread: 0, items: [] };
  const toggleBell = () => {
    setIsBellOpen((open) => !open);
    setIsMenuOpen(false);
    if (!isBellOpen && notifications.unread > 0) {
      router.post("/notifications/read", {}, { preserveScroll: true, preserveState: true, only: ["notifications"] });
    }
  };
  const openNotification = (item) => {
    setIsBellOpen(false);
    const tab = item.url ? new URL(item.url, window.location.origin).searchParams.get("tab") : null;
    if (tab) openAccountSection(tab);
  };
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  // The open section lives in the URL (?tab=), so it survives the page reload
  // after every action and can be linked to directly.
  const [accountTab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).get("tab") || ({ employer: "job-offers", admin: "companies" }[role] || "skills"));
  const setAccountTab = (tab) => {
    setTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
  };
  // An action redirects "back" to the last full page load, which can carry an
  // older ?tab=. Keep the address bar on the tab actually shown, so a refresh
  // after any action reopens the same tab.
  const tabRef = useRef(accountTab);
  tabRef.current = accountTab;
  useEffect(() => router.on("success", () => setTimeout(() => {   // after Inertia writes its URL
    const url = new URL(window.location.href);
    if (url.pathname === "/dashboard" && url.searchParams.get("tab") !== tabRef.current) {
      url.searchParams.set("tab", tabRef.current);
      window.history.replaceState(window.history.state, "", url);
    }
  }, 0)), []);

  // Server feedback: flash messages and form errors that are not tied to a field.
  const fieldError = props.errors?.hire || props.errors?.assessment || props.errors?.taskAnswer || props.errors?.taskFile;
  const notice = props.flash?.error || fieldError
    ? { tone: "error", text: props.flash?.error || fieldError }
    : props.flash?.success ? { tone: "success", text: props.flash.success } : null;
  const [noticeHidden, setNoticeHidden] = useState(false);
  useEffect(() => {
    setNoticeHidden(false);
    if (!notice || notice.tone === "error") return;
    const t = setTimeout(() => setNoticeHidden(true), 4000);
    return () => clearTimeout(t);
  }, [notice?.text]);

  const publicNavLinks = [
    { label: "Home", target: "home" },
    { label: "Process", target: "process" },
    { label: "Industry", target: "industry" },
    { label: "Benefit", target: "benefit" },
    { label: "Testimonial", target: "testimonial" },
    { label: "FAQs", target: "faqs" },
    { label: "Browse jobs", href: "/jobs" },   // Fig. 2, 202: guests can browse
  ];

  const accountSections = [
    { key: "skills", label: "Skills" },
    { key: "portfolio", label: "Portfolio" },
    { key: "matches", label: "Matches" },
    { key: "applications", label: "Applications" },
    { key: "badges", label: "Badges" },
    { key: "assessments", label: "Assessment" },
    { key: "browse", label: "Find Jobs" },
    { key: "companies", label: "Companies" },
  ];

  const employerSections = [
    { key: "job-offers", label: "Job Offers" },
    { key: "assessments", label: "Assessments" },
    { key: "applicants", label: "Applicants" },
    { key: "matches", label: "Matches" },
    { key: "analytics", label: "Analytics" },
  ];

  const adminSections = [
    { key: "companies", label: "Companies" },
    { key: "certificates", label: "Certificates" },
    { key: "assessments", label: "Assessments" },
    { key: "history", label: "History" },
  ];

  const menuSections = role === "employer" ? employerSections : accountSections;
  const profileSection = role === "employer"
    ? { key: "company", label: "Company Profile" }
    : { key: "settings", label: "Settings" };
  const navSections = role === "admin" ? adminSections : [...menuSections, profileSection];
  const pageTitle = account ? navSections.find((s) => s.key === accountTab)?.label : null;

  const scrollToSection = (event, target, href) => {
    event.preventDefault();
    setIsNavOpen(false);
    if (href) return router.visit(href);
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
    if (!isMenuOpen && !isBellOpen) return;
    const handleClick = (event) => {
      if (!event.target.closest("[data-user-menu]")) setIsMenuOpen(false);
      if (!event.target.closest("[data-bell-menu]")) setIsBellOpen(false);
    };
    const handleKey = (event) => { if (event.key === "Escape") { setIsMenuOpen(false); setIsBellOpen(false); } };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("click", handleClick); window.removeEventListener("keydown", handleKey); };
  }, [isMenuOpen, isBellOpen]);

  const getDisplayName = () => {
    const first = user?.firstName || (user?.name || "").split(" ")[0] || "";
    const surname = user?.surname || "";
    return [first, surname].filter(Boolean).join(" ").trim() || user?.name || "User";
  };

  const getAvatarLabel = () => (user?.firstName?.[0] || user?.name?.[0] || "U").toUpperCase();

  // Rendered inline (not as a nested component) so the view keeps its state
  // between renders of this page.
  const activeView = props.publicJobs
    ? <PublicJobs jobs={props.publicJobs} />
    : !account
    ? <GeneralDashboard landing={props.landing} />
    : account.role === "admin"
      ? <AdminDashboard account={account} activeTab={accountTab} />
    : account.role === "employer"
      ? <EmployerDashboard account={account} activeTab={accountTab} onTabChange={setAccountTab} />
      : <UserProfile account={account} activeTab={accountTab} onTabChange={setAccountTab} />;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <Head title={pageTitle || undefined} />
      <style>{globalStyles}</style>

      <nav className="sbph-nav" aria-label="Main">
        <div className="sbph-nav-wrap">
          <div className="sbph-brand" onClick={() => router.visit("/")} role="link" aria-label="SkillBridge PH home">
            <span className="sbph-brand-icon" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 25 V15 C9 8 27 8 27 15 V25" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 20 H27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="9" cy="15" r="2.5" fill="white" />
                <circle cx="27" cy="15" r="2.5" fill="white" />
                <circle cx="18" cy="20" r="2.5" fill="white" />
              </svg>
            </span>
            <span className="sbph-brand-text">SkillBridge <span className="sbph-brand-ph">PH</span></span>
          </div>
          <nav className="sbph-nav-center" aria-label="Sections">
            {account ? navSections.map(({ key, label }) => (
              <a
                key={key}
                href={`?tab=${key}`}
                onClick={(event) => { event.preventDefault(); openAccountSection(key); }}
                className={`sbph-nav-link${accountTab === key ? " active" : ""}`}
                aria-current={accountTab === key ? "page" : undefined}
              >
                {label}
              </a>
            )) : publicNavLinks.map((item) => (
              <a
                key={item.label}
                href={item.href || `#${item.target}`}
                onClick={(event) => scrollToSection(event, item.target, item.href)}
                className={`sbph-nav-link${(item.href ? !!props.publicJobs : !props.publicJobs && activeSection === item.target) ? " active" : ""}`}
                aria-current={(item.href ? !!props.publicJobs : !props.publicJobs && activeSection === item.target) ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="sbph-nav-actions">
          {isAuthenticated && (
            <div data-bell-menu style={{ position: "relative" }}>
              <button
                type="button"
                className="sbph-bell"
                onClick={toggleBell}
                aria-haspopup="true"
                aria-expanded={isBellOpen}
                aria-label={notifications.unread ? `Notifications, ${notifications.unread} unread` : "Notifications"}
              >
                <IconBell size={18} />
                {notifications.unread > 0 && (
                  <span className="sbph-bell-count" aria-hidden="true">{notifications.unread > 9 ? "9+" : notifications.unread}</span>
                )}
              </button>
              {isBellOpen && (
                <div className="sbph-bell-panel" role="region" aria-label="Notifications">
                  <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: COLORS.brownDeep, borderBottom: `1px solid ${COLORS.parchmentDeep}` }}>
                    Notifications
                  </div>
                  {notifications.items.length === 0 ? (
                    <p style={{ margin: 0, padding: "18px 14px", fontSize: 13, color: COLORS.textLight }}>
                      No updates yet. You will be told here and by email when an application moves.
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", margin: 0, padding: 6, maxHeight: 360, overflowY: "auto" }}>
                      {notifications.items.map((item) => (
                        <li key={item.id}>
                          <button type="button" className="sbph-bell-item" onClick={() => openNotification(item)}>
                            {!item.read && <span className="sbph-bell-dot" aria-label="New" />}
                            <span style={{ flex: 1 }}>
                              <span style={{ display: "block", fontSize: 13, color: COLORS.brownDeep, lineHeight: 1.4 }}>{item.text}</span>
                              <span style={{ display: "block", fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{item.at}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          {isAuthenticated ? (
            <div data-user-menu style={{ position: "relative" }}>
              <button
                type="button"
                className="sbph-usertrigger"
                aria-label={`Account menu for ${getDisplayName()}`}
                onClick={() => { setIsMenuOpen((prev) => !prev); setIsBellOpen(false); }}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                <span className="sbph-username" style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    <div style={{ fontSize: 12, color: COLORS.textLight, textTransform: "capitalize" }}>
                      {{ employer: "Employer account", admin: "Admin account" }[role] || "Applicant account"}
                    </div>
                  </div>
                  <div style={{ height: 1, background: COLORS.parchmentDeep, margin: "2px 6px 6px" }} />
                  {!account && (
                    <button type="button" role="menuitem" className="sbph-menu-item" onClick={() => router.visit("/dashboard")}>
                      <IconUser size={16} />
                      Dashboard
                    </button>
                  )}
                  <button type="button" role="menuitem" className="sbph-menu-item sbph-menu-item--danger" onClick={handleLogout}>
                    <IconLogout size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="sbph-auth-cta">
              <a href="/login" className="sbph-cta sbph-cta--ghost">Sign in</a>
              <a href="/signup" className="sbph-cta sbph-cta--solid">Sign up</a>
            </div>
          )}
            <button
              type="button"
              className="sbph-hamburger"
              aria-label="Toggle navigation menu"
              aria-expanded={isNavOpen}
              aria-controls="sbph-mobile-drawer"
              onClick={() => setIsNavOpen((prev) => !prev)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      <div id="sbph-mobile-drawer" className={`sbph-drawer${isNavOpen ? " open" : ""}`}>
        <div className="sbph-drawer-inner">
          {account ? navSections.map(({ key, label }) => (
            <a
              key={key}
              href={`?tab=${key}`}
              onClick={(event) => { event.preventDefault(); setIsNavOpen(false); openAccountSection(key); }}
              className={`sbph-nav-link${accountTab === key ? " active" : ""}`}
              aria-current={accountTab === key ? "page" : undefined}
            >
              {label}
            </a>
          )) : publicNavLinks.map((item) => (
            <a
              key={item.label}
              href={item.href || `#${item.target}`}
              onClick={(event) => scrollToSection(event, item.target, item.href)}
              className={`sbph-nav-link${activeSection === item.target ? " active" : ""}`}
              aria-current={activeSection === item.target ? "true" : undefined}
            >
              {item.label}
            </a>
          ))}
          {!isAuthenticated && (
            <div className="sbph-drawer-cta">
              <a href="/login" className="sbph-cta sbph-cta--ghost">Sign in</a>
              <a href="/signup" className="sbph-cta sbph-cta--solid">Sign up</a>
            </div>
          )}
        </div>
      </div>

      {notice && !noticeHidden && (
        <div role={notice.tone === "error" ? "alert" : "status"} aria-live="polite" style={{
          position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)", zIndex: 80,
          width: "min(560px, calc(100% - 32px))", display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.45,
          background: notice.tone === "error" ? "#FEF2F2" : "#F0FDF4",
          border: `1px solid ${notice.tone === "error" ? "#FECACA" : "#BBF7D0"}`,
          color: notice.tone === "error" ? "#991B1B" : "#166534",
          boxShadow: "0 12px 30px rgba(12, 74, 110, 0.16)",
        }}>
          <span style={{ fontWeight: 700 }}>{notice.tone === "error" ? "Not done:" : "Done:"}</span>
          <span style={{ flex: 1 }}>{notice.text}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNoticeHidden(true)}
            style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", minWidth: 24, minHeight: 24 }}>×</button>
        </div>
      )}

      <main className={account?.role === "jobseeker" ? "sbph-main--bottomnav" : undefined} style={{ minHeight: "calc(100vh - 64px)" }}>
        {activeView}
      </main>

      {/* Patent Fig. 21, 2116: the same bottom navigation on every phone screen
          (job feed 2102, badge wallet 2104, badge detail 2106). */}
      {account?.role === "jobseeker" && (
        <nav className="sbph-bottomnav" aria-label="Phone navigation">
          {[["browse", "Jobs", IconSearch], ["badges", "Badges", IconAward], ["applications", "Applications", IconClipboardCheck], ["settings", "Profile", IconUser]].map(([key, label, Icon]) => (
            <a key={key} href={`?tab=${key}`} aria-current={accountTab === key ? "page" : undefined}
              className={`sbph-bottomnav-item${accountTab === key ? " active" : ""}`}
              onClick={(event) => { event.preventDefault(); openAccountSection(key); window.scrollTo(0, 0); }}>
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
