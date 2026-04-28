import { COLORS } from "../styles/theme";

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "0",
    padding: "0",
    background: `radial-gradient(circle at 12% 8%, rgba(243,199,78,0.22), transparent 40%),
      radial-gradient(circle at 88% 12%, rgba(46,140,123,0.14), transparent 42%),
      linear-gradient(180deg, ${COLORS.parchment} 0%, ${COLORS.cream} 45%, ${COLORS.parchmentDark} 100%)`,
  },
  hero: {
    borderRadius: "0",
    padding: "40px 64px",
    background: `linear-gradient(135deg, ${COLORS.cream} 0%, ${COLORS.parchment} 60%, ${COLORS.parchmentDark} 100%)`,
    color: COLORS.brownDeep,
    boxShadow: "0 32px 70px rgba(11, 29, 58, 0.16)",
    display: "grid",
    gap: "32px",
    position: "relative",
    overflow: "hidden",
    minHeight: "100vh",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 12% 8%, rgba(243,199,78,0.2), transparent 46%)",
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
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(34px, 4.6vw, 58px)",
    fontWeight: 700,
    margin: 0,
    color: COLORS.brownDeep,
  },
  heroText: {
    fontSize: "15px",
    lineHeight: 1.7,
    color: COLORS.textMid,
    margin: 0,
    maxWidth: "54ch",
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
    background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.successLight})`,
    color: COLORS.cream,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 16px 32px rgba(46, 140, 123, 0.3)",
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
    fontSize: "11px",
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
    border: `1px solid ${COLORS.parchmentDeep}`,
    borderRadius: "0",
    padding: "64px",
    boxShadow: "0 18px 42px rgba(11, 29, 58, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    minHeight: "100vh",
  },
  sectionSplit: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "32px",
    alignItems: "center",
  },
  sectionCenter: {
    display: "grid",
    gap: "12px",
    textAlign: "center",
    justifyItems: "center",
  },
  sectionBadge: {
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(243,199,78,0.18)",
    border: "1px solid rgba(243,199,78,0.35)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: COLORS.rust,
  },
  sectionTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
    color: COLORS.brownDeep,
  },
  sectionText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.7,
    color: COLORS.textLight,
    maxWidth: "70ch",
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
    fontSize: 10,
    fontWeight: 700,
  },
  jobMatch: {
    fontSize: 11,
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
    background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.successLight} 100%)`,
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
    background: COLORS.brownDeep,
    color: COLORS.cream,
    borderRadius: "0",
    padding: "64px",
    display: "grid",
    gap: "28px",
    minHeight: "100vh",
  },
  footerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "24px",
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: 0,
    color: COLORS.cream,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(253,246,232,0.7)",
    margin: 0,
  },
  footerLink: {
    fontSize: 12,
    color: "rgba(253,246,232,0.7)",
  },
  footerSocialRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  socialBadge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(253,246,232,0.12)",
    color: COLORS.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  appButtonRow: {
    display: "grid",
    gap: "10px",
  },
  appButton: {
    border: "1px solid rgba(253,246,232,0.2)",
    borderRadius: "999px",
    padding: "8px 14px",
    color: COLORS.cream,
    background: "rgba(253,246,232,0.08)",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
  },
  paymentRow: {
    display: "grid",
    gap: "12px",
  },
  paymentList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  paymentPill: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(253,246,232,0.12)",
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: 600,
  },
  footerBottom: {
    fontSize: 11,
    color: "rgba(253,246,232,0.6)",
    textAlign: "center",
  },
};

const globalStats = [
  { label: "Active job posts", value: "4,812", detail: "Across SMEs and enterprise" },
  { label: "Verified skill badges", value: "18,420", detail: "Assessments completed" },
  { label: "Hiring locations", value: "142", detail: "Nationwide coverage" },
  { label: "Daily matches", value: "1,250", detail: "Personalized signals" },
  { label: "Top industries", value: "24", detail: "Retail, services, creatives" },
  { label: "Average response", value: "36 hrs", detail: "From employer reply" },
];

const howSteps = [
  {
    title: "Create a verified profile",
    description: "Build your skill-based identity with assessments and portfolio evidence.",
  },
  {
    title: "Match to real demand",
    description: "See roles aligned with your verified skills, location, and availability.",
  },
  {
    title: "Apply and track",
    description: "Use one-tap applications and track employer responses in real time.",
  },
  {
    title: "Hire with confidence",
    description: "Employers review verified signals instead of guessing from resumes.",
  },
];

const jobCards = [
  { title: "Customer Service Associate", company: "MetroMarket", location: "Quezon City", tag: "Full-time", match: "92% match" },
  { title: "Retail Sales Assistant", company: "Harbor Mart", location: "Taguig City", tag: "On-site", match: "88% match" },
  { title: "Virtual Assistant", company: "TaskBridge Partners", location: "Remote", tag: "Remote", match: "86% match" },
  { title: "Graphic Designer", company: "Luna Creative", location: "Remote", tag: "Contract", match: "84% match" },
  { title: "Barista", company: "Sunrise Coffee", location: "Makati", tag: "Full-time", match: "81% match" },
  { title: "Inventory Clerk", company: "BrightMart", location: "Pasig", tag: "On-site", match: "79% match" },
];

const categoryCards = [
  { title: "Frontline Service", meta: "128 open roles", icon: "FS" },
  { title: "Retail Operations", meta: "94 open roles", icon: "RO" },
  { title: "Creative Support", meta: "76 open roles", icon: "CS" },
  { title: "Admin & VA", meta: "112 open roles", icon: "VA" },
  { title: "Food & Beverage", meta: "67 open roles", icon: "FB" },
  { title: "Entry-level IT", meta: "59 open roles", icon: "IT" },
];

const employerFeatures = [
  "Post roles with required skill badges and immediate scoring.",
  "Filter by verified level, location, and availability status.",
  "See applicant readiness summaries and recent activity.",
  "Shortlist and message candidates without leaving the dashboard.",
  "Track time-to-hire and pipeline health in real time.",
];

const testimonials = [
  {
    quote: "We hired three entry-level associates in one week using verified badges.",
    name: "Maribel D.",
    role: "HR Lead, retail chain",
  },
  {
    quote: "The public dashboard helped me see where my skills were trending before I applied.",
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
    question: "Do I need an account to browse public insights?",
    answer: "No. The public dashboard shows open data. Sign up to unlock personalized matches and applications.",
  },
  {
    question: "How are skills verified?",
    answer: "Skills are validated with short task assessments and peer-reviewed evidence checks.",
  },
  {
    question: "Can employers filter applicants by location?",
    answer: "Yes. Location, verified skill levels, and availability are all filterable once logged in.",
  },
  {
    question: "Is SkillBridge PH only for tech roles?",
    answer: "No. The platform focuses on frontline, service, retail, creative, and early-career roles.",
  },
];

const faqCtas = [
  {
    title: "Do you want to hire verified talent?",
    text: "Create employer access and start shortlisting in minutes.",
    action: "Post a job",
    tone: "light",
  },
  {
    title: "Do you want to find work faster?",
    text: "Build your verified profile and start matching today.",
    action: "Find roles",
    tone: "accent",
  },
];

const footerLinks = ["Home", "Insights", "Employers", "Community", "Resources", "FAQs", "Contact"];
const footerCategories = ["Frontline Service", "Retail", "Creative", "Admin & VA", "Food & Beverage", "Entry-level IT"];
const socialLinks = ["FB", "IG", "IN", "X"];
const paymentMethods = ["PayMaya", "GCash", "Visa", "Mastercard", "PayPal", "UnionBank"];

export default function GeneralDashboard() {
  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroGlow} />
        <div style={{ position: "relative", zIndex: 1, display: "grid", gap: "36px" }}>
          <div style={styles.heroBody}>
            <div style={styles.heroColumn}>
              <h1 style={styles.heroTitle}>Smart hiring starts with verified skills.</h1>
              <p style={styles.heroText}>
                SkillBridge PH connects verified talent with real hiring demand across the Philippines.
              </p>
              <div style={styles.heroActions}>
                <button style={styles.primaryButton} onClick={() => window.location.href = "/login"}>Start exploring</button>
                <button style={styles.ghostButton} onClick={() => window.location.href = "/signup"}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: COLORS.brownDeep, color: COLORS.cream, fontSize: 12 }}>
                    ▶
                  </span>
                  How it works
                </button>
              </div>
              <div style={styles.heroStatRow}>
                {globalStats.slice(0, 3).map((stat) => (
                  <div key={stat.label} style={styles.heroStatPill}>
                    <span style={{ fontWeight: 700, color: COLORS.brownDeep }}>{stat.value}</span>
                    <span style={{ marginLeft: 6 }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.heroProfileWrap}>
              <div style={styles.heroImageFrame}>
                <img
                  src="/images/skillbridge-hero.png"
                  alt="SkillBridge PH hiring illustration"
                  style={styles.heroImage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionSplit}>
          <div style={styles.heroColumn}>
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
          </div>
          <div style={styles.jobGrid}>
            {jobCards.map((job) => (
              <div key={job.title} style={styles.jobCard}>
                <div style={styles.jobCardTop}>
                  <span style={styles.jobTag}>{job.tag}</span>
                  <span style={styles.jobMatch}>{job.match}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textDark }}>{job.title}</div>
                <div style={styles.jobMeta}>{job.company}</div>
                <div style={styles.jobMeta}>{job.location}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionCenter}>
          <span style={styles.sectionBadge}>Industries</span>
          <h2 style={styles.sectionTitle}>Browse by category</h2>
          <p style={styles.sectionText}>
            Explore open roles by industry focus and verified skill demand.
          </p>
        </div>
        <div style={styles.categoryGrid}>
          {categoryCards.map((category) => (
            <div key={category.title} style={styles.categoryCard} className="sbph-category-card">
              <div style={styles.categoryIcon}>{category.icon}</div>
              <div style={styles.categoryTitle}>{category.title}</div>
              <div style={styles.categoryMeta}>{category.meta}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionSplit}>
          <div style={styles.employerVisual}>
            <div style={styles.employerHeader}>
              <span>Employer dashboard</span>
              <span>Live pipeline</span>
            </div>
            <div style={styles.employerCard}>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>Active roles</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.goldLight }}>24</div>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>Verified applicants this week</div>
            </div>
            <div style={styles.employerMetricRow}>
              {[
                { label: "Shortlisted", value: "38" },
                { label: "Interviews", value: "12" },
                { label: "Offers", value: "5" },
              ].map((item) => (
                <div key={item.label} style={styles.employerMetricCard}>
                  <div style={styles.employerMetricValue}>{item.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(253,246,232,0.7)" }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={styles.employerCard}>
              <div style={{ fontSize: 12, color: "rgba(253,246,232,0.7)" }}>Top verified skills</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["Customer Service", "Scheduling", "Sales", "Inventory"].map((skill) => (
                  <span key={skill} style={{ padding: "4px 8px", borderRadius: "999px", border: "1px solid rgba(253,246,232,0.2)", fontSize: 10 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={styles.heroColumn}>
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
            <button style={styles.primaryButton} onClick={() => window.location.href = "/signup"}>Post a job</button>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionCenter}>
          <span style={styles.sectionBadge}>Testimonials</span>
          <h2 style={styles.sectionTitle}>What teams and candidates say</h2>
          <p style={styles.sectionText}>
            Real feedback from employers and applicants using SkillBridge PH.
          </p>
        </div>
        <div style={styles.testimonialGrid}>
          {testimonials.map((item) => (
            <div key={item.name} style={styles.testimonialCard}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: COLORS.textDark }}>
                "{item.quote}"
              </p>
              <p style={{ margin: 0, fontSize: 12, color: COLORS.textLight }}>{item.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: COLORS.textMid }}>{item.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.faqSplit}>
          <div style={styles.heroColumn}>
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
          </div>
          <div style={styles.ctaGrid}>
            {faqCtas.map((cta) => (
              <div key={cta.title} style={cta.tone === "accent" ? styles.ctaCardAlt : styles.ctaCard}>
                <h3 style={styles.ctaTitle}>{cta.title}</h3>
                <p style={styles.ctaText}>{cta.text}</p>
                <button style={styles.ctaButton}>{cta.action}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerGrid}>
          <div style={styles.heroColumn}>
            <div style={styles.navLogo}>SkillBridge PH</div>
            <p style={styles.footerText}>
              A verified hiring platform connecting applicants and employers through proof-based skills.
            </p>
            <div style={styles.footerSocialRow}>
              {socialLinks.map((social) => (
                <span key={social} style={styles.socialBadge}>{social}</span>
              ))}
            </div>
          </div>
          <div style={styles.heroColumn}>
            <h3 style={styles.footerTitle}>Company info</h3>
            {footerLinks.map((link) => (
              <span key={link} style={styles.footerLink}>{link}</span>
            ))}
          </div>
          <div style={styles.heroColumn}>
            <h3 style={styles.footerTitle}>Top categories</h3>
            {footerCategories.map((category) => (
              <span key={category} style={styles.footerLink}>{category}</span>
            ))}
          </div>
          <div style={styles.heroColumn}>
            <h3 style={styles.footerTitle}>Download the app</h3>
            <p style={styles.footerText}>Quezon City, Philippines</p>
            <p style={styles.footerText}>+63 917 123 4567</p>
            {/* <div style={styles.appButtonRow}>
              <span style={styles.appButton}>Get it on Google Play</span>
              <span style={styles.appButton}>Download on the App Store</span>
            </div> */}
          </div>
        </div>
        <div style={styles.paymentRow}>
          <h3 style={styles.footerTitle}>We Accept Payment Gateway</h3>
          <div style={styles.paymentList}>
            {paymentMethods.map((method) => (
              <span key={method} style={styles.paymentPill}>{method}</span>
            ))}
          </div>
        </div>
        <div style={styles.footerBottom}>© 2026 SkillBridge PH. All rights reserved.</div>
      </footer>
    </div>
  );
}
