import { useEffect, useRef, useState } from "react";
import { COLORS } from "../styles/ui";

// Scroll-reveal wrapper: fades + slides content into view as it enters the
// viewport (HopeRise-style). Honors reduced-motion and reveals only once.
function Reveal({ children, as: Tag = "div", style, delay = 0, from = "up", ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    // Replay every time the element enters OR leaves the viewport, so the
    // animation re-triggers on each scroll up or down (not just once).
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -12% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const offset =
    from === "left" ? "translateX(-48px)"
    : from === "right" ? "translateX(48px)"
    : from === "scale" ? "scale(0.94)"
    : "translateY(48px)";

  return (
    <Tag
      ref={ref}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? undefined : offset,
        transition: `opacity 0.8s ease ${delay}ms, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const dashboardStyles = `
  .sbph-lift { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease; }
  .sbph-lift:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(11, 29, 58, 0.16); }
  .sbph-category-card:hover { transform: translateY(-6px); box-shadow: 0 22px 46px rgba(11, 29, 58, 0.16); transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease; }
  .sbph-faq { transition: box-shadow 0.3s ease, border-color 0.3s ease; }
  .sbph-faq[open] { box-shadow: 0 16px 34px rgba(11, 29, 58, 0.1); }
  .sbph-footer-grid { grid-template-columns: 1.6fr 1fr 1fr 1.3fr; }
  @media (max-width: 860px) { .sbph-footer-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .sbph-footer-grid { grid-template-columns: 1fr; } }
  .sbph-footer-link { transition: color 0.2s ease, transform 0.2s ease; cursor: pointer; }
  .sbph-footer-link:hover { color: #FFD98A; transform: translateX(3px); }
  @media (prefers-reduced-motion: reduce) {
    .sbph-lift, .sbph-category-card, .sbph-faq, .sbph-footer-link { transition: none; }
  }
`;

const styles = {
  page: {
    overflowX: "clip",
    display: "flex",
    flexDirection: "column",
    gap: "0",
    padding: "0",
    fontFamily: "'Source Sans 3', sans-serif",
    background: `radial-gradient(circle at 12% 8%, rgba(14,165,233,0.16), transparent 40%),
      radial-gradient(circle at 88% 12%, rgba(22,163,74,0.12), transparent 42%),
      linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 45%, ${COLORS.parchmentDark} 100%)`,
  },
  hero: {
    borderRadius: "0",
    padding: "clamp(56px, 8vh, 104px) clamp(24px, 5vw, 72px)",
    background: `linear-gradient(135deg, ${COLORS.cream} 0%, ${COLORS.parchment} 60%, ${COLORS.parchmentDark} 100%)`,
    color: COLORS.brownDeep,
    boxShadow: "0 32px 70px rgba(11, 29, 58, 0.16)",
    display: "grid",
    gap: "32px",
    position: "relative",
    overflow: "hidden",
    scrollMarginTop: "72px",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 12% 8%, rgba(14,165,233,0.14), transparent 46%)",
    pointerEvents: "none",
  },
  navLogo: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLORS.brownDeep,
  },
  heroBody: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "40px",
    alignItems: "center",
  },
  heroColumn: {
    display: "grid",
    gap: "16px",
  },
  heroTitle: {
    fontFamily: "'Lexend', sans-serif",
    fontSize: "clamp(42px, 6.4vw, 82px)",
    fontWeight: 700,
    lineHeight: 1.04,
    letterSpacing: "-0.015em",
    margin: 0,
    color: COLORS.brownDeep,
  },
  heroText: {
    fontSize: "clamp(15px, 1.3vw, 18px)",
    lineHeight: 1.7,
    color: COLORS.textMid,
    margin: 0,
    maxWidth: "56ch",
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  },
  primaryButton: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 20px",
    background: `linear-gradient(90deg, ${COLORS.success}, #166534)`,
    color: COLORS.cream,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 16px 32px rgba(22, 163, 74, 0.28)",
  },
  ghostButton: {
    border: `1px solid ${COLORS.parchmentDeep}`,
    borderRadius: "999px",
    padding: "12px 20px",
    background: "transparent",
    color: COLORS.brownDeep,
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
  },
  heroStatRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  heroStatPill: {
    padding: "8px 12px",
    borderRadius: "999px",
    border: `1px solid ${COLORS.parchmentDeep}`,
    background: COLORS.cream,
    color: COLORS.textMid,
    fontSize: "13px",
    fontWeight: 600,
  },
  heroProfileWrap: {
    position: "relative",
    display: "grid",
    gap: "18px",
  },

  heroImage: {
    width: "100%",
    maxWidth: 490,
    height: "auto",
    display: "block",
  },
  section: {
    background: COLORS.cream,
    borderTop: `1px solid ${COLORS.parchmentDeep}`,
    borderRadius: "0",
    padding: "clamp(56px, 8vh, 96px) clamp(24px, 5vw, 72px)",
    display: "flex",
    flexDirection: "column",
    gap: "40px",
    scrollMarginTop: "72px",
  },
  sectionSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "48px",
    alignItems: "center",
  },
  sectionCenter: {
    display: "grid",
    gap: "14px",
    textAlign: "center",
    justifyItems: "center",
    maxWidth: "62ch",
    margin: "0 auto",
  },
  sectionBadge: {
    padding: "7px 16px",
    borderRadius: "999px",
    background: "rgba(3,105,161,0.10)",
    border: "1px solid rgba(3,105,161,0.24)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.32em",
    textTransform: "uppercase",
    color: COLORS.brownLight,
  },
  sectionTitle: {
    margin: 0,
    fontFamily: "'Lexend', sans-serif",
    fontSize: "clamp(28px, 3.6vw, 48px)",
    fontWeight: 700,
    lineHeight: 1.08,
    letterSpacing: "-0.01em",
    color: COLORS.brownDeep,
  },
  sectionText: {
    margin: 0,
    fontSize: "clamp(14px, 1.15vw, 16px)",
    lineHeight: 1.75,
    color: COLORS.textLight,
    maxWidth: "68ch",
  },
  stepList: {
    display: "grid",
    gap: "16px",
  },
  stepItem: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "14px",
    alignItems: "flex-start",
    padding: "14px",
    borderRadius: "16px",
    border: `1px solid ${COLORS.parchmentDeep}`,
    background: COLORS.parchment,
  },
  stepIndex: {
    width: 36,
    height: 36,
    borderRadius: "12px",
    background: COLORS.brownDeep,
    color: COLORS.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  stepTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.brownDeep,
  },
  stepText: {
    margin: "6px 0 0",
    fontSize: 12,
    color: COLORS.textLight,
  },
  jobGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  jobCard: {
    borderRadius: "18px",
    padding: "16px",
    background: COLORS.parchment,
    border: `1px solid ${COLORS.parchmentDeep}`,
    display: "grid",
    gap: "10px",
  },
  jobCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  jobTag: {
    padding: "4px 8px",
    borderRadius: "999px",
    background: COLORS.brownDeep,
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: 700,
  },
  jobMatch: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.success,
  },
  jobMeta: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  categoryCard: {
    borderRadius: "18px",
    padding: "18px",
    background: COLORS.cream,
    border: `1px solid ${COLORS.parchmentDeep}`,
    display: "grid",
    gap: "10px",
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: "14px",
    background: COLORS.parchmentDark,
    color: COLORS.brownDeep,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.brownDeep,
  },
  categoryMeta: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  employerVisual: {
    borderRadius: "24px",
    padding: "24px",
    background: COLORS.brownDeep,
    color: COLORS.cream,
    display: "grid",
    gap: "16px",
    boxShadow: "0 24px 50px rgba(11, 29, 58, 0.32)",
  },
  employerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    color: "rgba(253,246,232,0.7)",
  },
  employerCard: {
    borderRadius: "16px",
    padding: "16px",
    background: "rgba(253,246,232,0.08)",
    border: "1px solid rgba(253,246,232,0.15)",
    display: "grid",
    gap: "10px",
  },
  employerMetricRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "12px",
  },
  employerMetricCard: {
    borderRadius: "14px",
    padding: "12px",
    background: "rgba(253,246,232,0.1)",
    border: "1px solid rgba(253,246,232,0.15)",
    textAlign: "center",
  },
  employerMetricValue: {
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.goldLight,
  },
  featureList: {
    display: "grid",
    gap: "12px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  featureItem: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    color: COLORS.textMid,
    fontSize: 13,
  },
  featureBullet: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: COLORS.success,
    color: COLORS.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 2,
  },
  testimonialGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  testimonialCard: {
    borderRadius: "18px",
    padding: "18px",
    background: COLORS.parchment,
    border: `1px solid ${COLORS.parchmentDeep}`,
    display: "grid",
    gap: "10px",
  },
  faqSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
    alignItems: "start",
  },
  faqList: {
    display: "grid",
    gap: "12px",
  },
  faqItem: {
    borderRadius: "16px",
    padding: "14px 16px",
    background: COLORS.parchment,
    border: `1px solid ${COLORS.parchmentDeep}`,
  },
  faqSummary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.textDark,
    cursor: "pointer",
  },
  faqAnswer: {
    margin: "10px 0 0",
    fontSize: 12,
    color: COLORS.textLight,
  },
  faqIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: COLORS.parchmentDark,
    color: COLORS.brownDeep,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  ctaGrid: {
    display: "grid",
    gap: "16px",
  },
  ctaCard: {
    borderRadius: "18px",
    padding: "20px",
    border: `1px solid ${COLORS.parchmentDeep}`,
    background: COLORS.cream,
    display: "grid",
    gap: "10px",
  },
  ctaCardAlt: {
    borderRadius: "18px",
    padding: "20px",
    border: `1px solid ${COLORS.parchmentDeep}`,
    background: `linear-gradient(135deg, ${COLORS.success} 0%, #166534 100%)`,
    color: COLORS.cream,
    display: "grid",
    gap: "10px",
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
  },
  ctaText: {
    fontSize: 12,
    margin: 0,
    color: "inherit",
  },
  ctaButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    background: COLORS.brownDeep,
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    justifySelf: "start",
  },
  footer: {
    background: `linear-gradient(160deg, ${COLORS.brownDeep} 0%, ${COLORS.brownMid} 100%)`,
    color: COLORS.cream,
    borderRadius: "0",
    padding: "clamp(56px, 7vh, 88px) clamp(24px, 5vw, 72px) 40px",
    display: "grid",
    gap: "40px",
  },
  footerGrid: {
    display: "grid",
    gap: "40px",
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: 700,
    margin: "0 0 4px",
    color: COLORS.goldLight,
    textTransform: "uppercase",
    letterSpacing: "0.16em",
  },
  footerText: {
    fontSize: 12,
    color: "rgba(253,246,232,0.7)",
    margin: 0,
  },
  footerLink: {
    fontSize: 13,
    color: "rgba(253,246,232,0.8)",
    textDecoration: "none",
    padding: "12px 0",
  },
  footerBottom: {
    fontSize: 12,
    color: "rgba(253,246,232,0.6)",
    textAlign: "center",
  },
};

// Patent Fig. 9 (924-928): the idea in three steps.
const howSteps = [
  {
    title: "Take an assessment",
    description: "Pick a skill you claimed and prove it with a timed, task-based assessment from a verified company.",
  },
  {
    title: "Earn a badge",
    description: "Pass and the skill becomes a verified badge with your score, the date, and a unique verification ID.",
  },
  {
    title: "Get matched",
    description: "Employers rank candidates by verified proof, so your badges put you in front of the right roles.",
  },
];

const employerFeatures = [
  "Post roles with required and preferred skills; matching candidates are ranked automatically.",
  "See each candidate's Green / Amber / Red check, with the reason behind every flag.",
  "Open applicants' CVs, certificates, and demo videos privately.",
  "Create timed assessments that award verified skill badges.",
  "Invite, shortlist, and hire, with every hiring decision recorded.",
];

// Placeholder quotes until real users can be asked; labelled as samples on the page.
const testimonials = [
  {
    quote: "We hired three entry-level associates in one week using verified badges.",
    name: "Maribel D.",
    role: "HR Lead, retail chain",
  },
  {
    quote: "Seeing which of my skills were verified told me exactly what to work on before applying.",
    name: "Ken R.",
    role: "Fresh graduate, IT support",
  },
  {
    quote: "Clean, transparent hiring signals without the endless back and forth.",
    name: "Aldrich C.",
    role: "SME founder",
  },
];

const faqs = [
  {
    question: "Do I need an account to browse?",
    answer: "No. This page shows the live open roles and counts. Sign up to get matched to roles and apply.",
  },
  {
    question: "How are skills verified?",
    answer: "Two ways, and every badge shows which one and who issued it: passing a timed assessment from a verified employer, or a verified employer reviewing your uploaded portfolio, certificate, or demo video and confirming the skill.",
  },
  {
    question: "Does location affect matching?",
    answer: "Yes. Location is part of the match score, together with required skills, preferred skills, and experience level.",
  },
  {
    question: "Is SkillBridge PH only for tech roles?",
    answer: "No. Employers in any industry can post roles and define the skills they require.",
  },
];

const faqCtas = [
  {
    title: "Do you want to hire verified talent?",
    text: "Create an employer account and post your first role.",
    action: "Post a job",
    href: "/signup?role=employer",
    tone: "light",
  },
  {
    title: "Do you want to find work faster?",
    text: "Build your verified profile and start matching today.",
    action: "Find roles",
    href: "/signup",
    tone: "accent",
  },
];

const footerLinks = [
  { label: "Home", href: "#home" },
  { label: "How it works", href: "#process" },
  { label: "Industries", href: "#industry" },
  { label: "For employers", href: "#benefit" },
  { label: "FAQs", href: "#faqs" },
];

const initials = (text) => text.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function GeneralDashboard({ landing }) {
  const stats = landing?.stats || {};
  const jobs = landing?.jobs || [];
  const industries = landing?.industries || [];
  const topSkills = landing?.topSkills || [];
  const heroStats = [
    { label: "Open roles", value: stats.openJobs ?? 0 },
    { label: "Verified skill badges", value: stats.verifiedBadges ?? 0 },
    { label: "Verified employers", value: stats.verifiedEmployers ?? 0 },
  ];

  return (
    <div style={styles.page}>
      <style>{dashboardStyles}</style>
      <section id="home" style={styles.hero}>
        <div style={styles.heroGlow} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: "36px" }}>
          <div style={styles.heroBody}>
            <Reveal style={styles.heroColumn} from="left">
              <h1 style={styles.heroTitle}>Smart hiring starts with verified skills.</h1>
              <p style={styles.heroText}>
                SkillBridge PH connects verified talent with real hiring demand across the Philippines.
              </p>
              <div style={styles.heroActions}>
                <button style={styles.primaryButton} onClick={() => window.location.href = "/login"}>Start exploring</button>
                <button style={styles.ghostButton} onClick={() => document.getElementById("process")?.scrollIntoView({ behavior: "smooth" })}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: COLORS.brownDeep, color: COLORS.cream, fontSize: 12 }}>
                    ▶
                  </span>
                  How it works
                </button>
              </div>
              <div style={styles.heroStatRow}>
                {heroStats.map((stat) => (
                  <div key={stat.label} style={styles.heroStatPill}>
                    <span style={{ fontWeight: 700, color: COLORS.brownDeep }}>{stat.value.toLocaleString()}</span>
                    <span style={{ marginLeft: 6 }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal style={styles.heroProfileWrap} from="right" delay={150}>
              <div style={styles.heroImageFrame}>
                <img
                  src="/images/skillbridge-hero.png"
                  alt="SkillBridge PH hiring illustration"
                  style={styles.heroImage}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="process" style={styles.section}>
        <div style={styles.sectionSplit}>
          <Reveal style={styles.heroColumn} from="left">
            <span style={styles.sectionBadge}>How it works</span>
            <h2 style={styles.sectionTitle}>From profile to hire in one flow</h2>
            <p style={styles.sectionText}>
              SkillBridge PH keeps the process simple for applicants and employers, with verified signals at every step.
            </p>
            <div style={styles.stepList}>
              {howSteps.map((step, index) => (
                <div key={step.title} style={styles.stepItem}>
                  <div style={styles.stepIndex}>{`0${index + 1}`}</div>
                  <div>
                    <p style={styles.stepTitle}>{step.title}</p>
                    <p style={styles.stepText}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <div style={styles.jobGrid}>
            {jobs.length === 0 && <p style={styles.sectionText}>No open roles yet. New employer posts appear here.</p>}
            {jobs.map((job, index) => (
              <Reveal key={job.id} style={styles.jobCard} className="sbph-lift" delay={index * 90}>
                <div style={styles.jobCardTop}>
                  <span style={styles.jobTag}>{job.tag}</span>
                  <span style={styles.jobMatch}>{job.skills} skill{job.skills === 1 ? "" : "s"} required</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textDark }}>{job.title}</div>
                <div style={styles.jobMeta}>{job.company}</div>
                <div style={styles.jobMeta}>{job.location}</div>
              </Reveal>
            ))}
            {jobs.length > 0 && (
              <a href="/jobs" style={{ ...styles.ghostButton, justifySelf: "start", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Browse all open jobs</a>
            )}
          </div>
        </div>
      </section>

      <section id="industry" style={styles.section}>
        <Reveal style={styles.sectionCenter}>
          <span style={styles.sectionBadge}>Industries</span>
          <h2 style={styles.sectionTitle}>Browse by category</h2>
          <p style={styles.sectionText}>
            Explore open roles by industry focus and verified skill demand.
          </p>
        </Reveal>
        <div style={styles.categoryGrid}>
          {industries.map((category, index) => (
            <Reveal key={category.title} style={styles.categoryCard} className="sbph-category-card" delay={index * 90}>
              <div style={styles.categoryIcon}>{initials(category.title)}</div>
              <div style={styles.categoryTitle}>{category.title}</div>
              <div style={styles.categoryMeta}>{category.openRoles} open role{category.openRoles === 1 ? "" : "s"}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="benefit" style={styles.section}>
        <div style={styles.sectionSplit}>
          <Reveal style={styles.employerVisual} from="left">
            <div style={styles.employerHeader}>
              <span>Employer dashboard</span>
              <span>Live across the platform</span>
            </div>
            <div style={styles.employerCard}>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>Open roles</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.goldLight }}>{stats.openJobs ?? 0}</div>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>{stats.verifiedApplicants ?? 0} applicants with a verified skill</div>
            </div>
            <div style={styles.employerMetricRow}>
              {[
                { label: "Shortlisted", value: stats.shortlisted ?? 0 },
                { label: "Interviewing", value: stats.interviewing ?? 0 },
                { label: "Hired", value: stats.hired ?? 0 },
              ].map((item) => (
                <div key={item.label} style={styles.employerMetricCard}>
                  <div style={styles.employerMetricValue}>{item.value}</div>
                  <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={styles.employerCard}>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>Most requested skills</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {topSkills.map((skill) => (
                  <span key={skill} style={{ padding: "4px 8px", borderRadius: "999px", border: "1px solid rgba(253,246,232,0.2)", fontSize: 12 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal style={styles.heroColumn} from="right" delay={120}>
            <span style={styles.sectionBadge}>Why employers choose us</span>
            <h2 style={styles.sectionTitle}>Hire with clarity, speed, and confidence</h2>
            <p style={styles.sectionText}>
              SkillBridge PH turns verified skills into actionable hiring decisions for teams of any size.
            </p>
            <ul style={styles.featureList}>
              {employerFeatures.map((feature) => (
                <li key={feature} style={styles.featureItem}>
                  <span style={styles.featureBullet}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button style={styles.primaryButton} onClick={() => window.location.href = "/signup?role=employer"}>Post a job</button>
          </Reveal>
        </div>
      </section>

      <section id="testimonial" style={styles.section}>
        <Reveal style={styles.sectionCenter}>
          <span style={styles.sectionBadge}>Testimonials</span>
          <h2 style={styles.sectionTitle}>What teams and candidates say</h2>
          <p style={styles.sectionText}>
            Sample testimonials, shown as placeholders until real users share their feedback.
          </p>
        </Reveal>
        <div style={styles.testimonialGrid}>
          {testimonials.map((item, index) => (
            <Reveal key={item.name} style={styles.testimonialCard} className="sbph-lift" delay={index * 110}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COLORS.textDark }}>
                "{item.quote}"
              </p>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textLight }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textMid }}>{item.role}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faqs" style={styles.section}>
        <div style={styles.faqSplit}>
          <Reveal style={styles.heroColumn} from="left">
            <span style={styles.sectionBadge}>FAQ</span>
            <h2 style={styles.sectionTitle}>Frequently asked questions</h2>
            <p style={styles.sectionText}>
              Everything you need to know before you create an account.
            </p>
            <div style={styles.faqList}>
              {faqs.map((faq) => (
                <details key={faq.question} style={styles.faqItem} className="sbph-faq">
                  <summary style={styles.faqSummary}>
                    <span>{faq.question}</span>
                    <span style={styles.faqIcon}>+</span>
                  </summary>
                  <p style={styles.faqAnswer}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </Reveal>
          <div style={styles.ctaGrid}>
            {faqCtas.map((cta, index) => (
              <Reveal key={cta.title} style={cta.tone === "accent" ? styles.ctaCardAlt : styles.ctaCard} className="sbph-lift" from="right" delay={index * 120}>
                <h3 style={styles.ctaTitle}>{cta.title}</h3>
                <p style={styles.ctaText}>{cta.text}</p>
                <button style={styles.ctaButton} onClick={() => window.location.href = cta.href}>{cta.action}</button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerGrid} className="sbph-footer-grid">
          <Reveal style={styles.heroColumn} delay={0}>
            <div style={styles.navLogo}>SkillBridge PH</div>
            <p style={styles.footerText}>
              A verified hiring platform connecting applicants and employers through proof-based skills.
            </p>
          </Reveal>
          <Reveal style={styles.heroColumn} delay={90}>
            <h3 style={styles.footerTitle}>Explore</h3>
            {footerLinks.map((link) => (
              <a key={link.label} href={link.href} style={styles.footerLink} className="sbph-footer-link">{link.label}</a>
            ))}
          </Reveal>
          <Reveal style={styles.heroColumn} delay={180}>
            <h3 style={styles.footerTitle}>Industries hiring</h3>
            {industries.map((category) => (
              <a key={category.title} href="#industry" style={styles.footerLink} className="sbph-footer-link">{category.title}</a>
            ))}
          </Reveal>
          <Reveal style={styles.heroColumn} delay={270}>
            <h3 style={styles.footerTitle}>Get started</h3>
            <a href="/signup" style={styles.footerLink} className="sbph-footer-link">Create an applicant account</a>
            <a href="/signup?role=employer" style={styles.footerLink} className="sbph-footer-link">Create an employer account</a>
            <a href="/login" style={styles.footerLink} className="sbph-footer-link">Log in</a>
          </Reveal>
        </div>
        <div style={{ height: 1, background: "rgba(253,246,232,0.14)" }} />
        <div style={styles.footerBottom}>© 2026 SkillBridge PH. All rights reserved.</div>
      </footer>
    </div>
  );
}
