import { useEffect, useMemo, useState } from "react";
import { COLORS } from "../styles/theme";
import { mockApplicants } from "../data/mockData";
import { getSession, setSession } from "../../JobSeeker/hooks/useSession";
import { calculateMatchScore, getJobLocation, parseTagInput } from "../utils/matching";

export default function EmployerView() {
  const [tab, setTab] = useState("job-offers");
  const [session, setSessionState] = useState(getSession());
  const existingProfile = session?.employerProfile ?? {};
  const shouldForceValidation = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("validate") === "employer"
    : false;
  const needsValidation = shouldForceValidation || session?.employerNeedsValidation;
  const [isEditingProfile, setIsEditingProfile] = useState(needsValidation);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [expandedMatchJobs, setExpandedMatchJobs] = useState({});
  const [formData, setFormData] = useState(() => ({
    companyEmail: existingProfile.companyEmail || "",
    password: "",
    confirmPassword: "",
    companyName: existingProfile.companyName || "",
    industry: existingProfile.industry || "",
    companySize: existingProfile.companySize || "",
    locationCity: existingProfile.locationCity || "",
    locationRegion: existingProfile.locationRegion || "",
    recruiterName: existingProfile.recruiterName || "",
    recruiterPosition: existingProfile.recruiterPosition || "",
    recruiterContact: existingProfile.recruiterContact || "",
    businessPermit: existingProfile.businessPermit || "",
    emailVerified: existingProfile.emailVerified || false,
  }));

  const defaultJobOffers = [
    {
      id: "job-1",
      title: "Junior Frontend Developer",
      locationCity: "Davao City",
      workSetup: "On-site",
      employmentType: "Full-time",
      salaryRange: "PHP 20k-28k",
      description: "Build responsive web interfaces for SME clients using React and modern CSS.",
      responsibilities: "Convert UI designs into React components, maintain styling, and fix UI bugs.",
      requiredSkills: ["React", "CSS", "JavaScript"],
      preferredSkills: ["Figma", "Git"],
      experienceLevel: "Entry",
      educationRequirement: "IT-related course preferred",
      status: "Open",
      applicants: 14,
      postedAt: "2026-04-05",
    },
    {
      id: "job-2",
      title: "WordPress & Webflow Developer",
      locationCity: "Davao City",
      workSetup: "On-site",
      employmentType: "Full-time",
      salaryRange: "PHP 18k-24k",
      description: "Build and maintain marketing websites for retail and food service clients.",
      responsibilities: "Customize WordPress sites, build Webflow pages, and ensure SEO basics.",
      requiredSkills: ["WordPress", "Webflow", "HTML", "CSS"],
      preferredSkills: ["SEO", "Figma"],
      experienceLevel: "Entry",
      educationRequirement: "Design or IT course preferred",
      status: "Open",
      applicants: 10,
      postedAt: "2026-04-10",
    },
    {
      id: "job-3",
      title: "Junior Laravel Backend Developer",
      locationCity: "Davao City",
      workSetup: "On-site",
      employmentType: "Full-time",
      salaryRange: "PHP 22k-30k",
      description: "Develop APIs and admin dashboards for client applications.",
      responsibilities: "Build Laravel endpoints, integrate MySQL, and write basic tests.",
      requiredSkills: ["Laravel", "MySQL", "REST API"],
      preferredSkills: ["PHP", "Docker"],
      experienceLevel: "Entry",
      educationRequirement: "IT-related course preferred",
      status: "Open",
      applicants: 12,
      postedAt: "2026-04-12",
    },
    {
      id: "job-4",
      title: "UI/UX Designer (Part-time)",
      locationCity: "Davao City",
      workSetup: "On-site",
      employmentType: "Part-time",
      salaryRange: "PHP 15k-20k",
      description: "Create user flows and UI kits for SME web projects.",
      responsibilities: "Produce wireframes, test flows, and deliver polished UI kits.",
      requiredSkills: ["UI Design", "UX Research", "Figma"],
      preferredSkills: ["Prototyping", "Design Systems"],
      experienceLevel: "Entry",
      educationRequirement: "Design course preferred",
      status: "Open",
      applicants: 8,
      postedAt: "2026-04-14",
    },
  ];
  const [jobOffers, setJobOffers] = useState(() => {
    const savedJobs = session?.employerJobs;
    return Array.isArray(savedJobs) && savedJobs.length > 0 ? savedJobs : defaultJobOffers;
  });
  const [jobForm, setJobForm] = useState(() => ({
    title: "",
    locationCity: existingProfile.locationCity || "",
    locationRegion: existingProfile.locationRegion || "",
    employmentType: "Full-time",
    workSetup: "On-site",
    salaryRange: "",
    description: "",
    responsibilities: "",
    requiredSkills: "",
    preferredSkills: "",
    experienceLevel: "Entry",
    educationRequirement: "",
    closingDate: "",
  }));
  const defaultAssessments = [
    {
      id: "assessment-1",
      title: "React UI Fundamentals",
      role: "Junior Frontend Developer",
      questionCount: 10,
      durationMinutes: 18,
      passingScore: 70,
      status: "Active",
      createdAt: "2026-04-08",
    },
    {
      id: "assessment-2",
      title: "Laravel API Build",
      role: "Junior Laravel Backend Developer",
      questionCount: 12,
      durationMinutes: 20,
      passingScore: 75,
      status: "Active",
      createdAt: "2026-04-12",
    },
    {
      id: "assessment-3",
      title: "WordPress + Webflow Practical",
      role: "WordPress & Webflow Developer",
      questionCount: 8,
      durationMinutes: 16,
      passingScore: 70,
      status: "Active",
      createdAt: "2026-04-13",
    },
    {
      id: "assessment-4",
      title: "UI/UX Case Study",
      role: "UI/UX Designer (Part-time)",
      questionCount: 6,
      durationMinutes: 14,
      passingScore: 70,
      status: "Active",
      createdAt: "2026-04-14",
    },
  ];
  const [assessments, setAssessments] = useState(() => {
    const savedAssessments = session?.employerAssessments;
    return Array.isArray(savedAssessments) && savedAssessments.length > 0
      ? savedAssessments
      : defaultAssessments;
  });
  const [assessmentForm, setAssessmentForm] = useState(() => ({
    title: "",
    role: "",
    questionCount: "10",
    durationMinutes: "20",
    passingScore: "70",
    instructions: "",
  }));

  const industryOptions = [
    "Technology",
    "Retail",
    "Healthcare",
    "Finance",
    "Education",
    "Hospitality",
    "Logistics",
    "Manufacturing",
    "Professional Services",
  ];

  const companySizeOptions = ["1-10", "11-50", "51-200", "201+"];
  const premiumBenefits = [
    "Priority listing in applicant recommendations",
    "Advanced filters by badge type and assessment score",
    "Custom assessment builder with auto-scoring",
    "Bulk outreach to shortlisted applicants",
    "Hiring funnel analytics and time-to-hire insights",
    "Team seats with role-based access",
  ];
  const statStrip = [
    { label: "Active applicants", value: "42", helper: "18 new this week", color: COLORS.textDark },
    { label: "Shortlisted", value: "6", helper: "3 in final review", color: COLORS.gold },
    { label: "Interviewing", value: "3", helper: "2 scheduled today", color: COLORS.rust },
    { label: "Hired this month", value: "1", helper: "1 offer accepted", color: COLORS.success },
  ];
  const topCandidates = useMemo(() => (
    [...mockApplicants]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)
  ), []);
  const matchedCandidates = useMemo(() => (
    jobOffers.map((job) => {
      const matches = mockApplicants
        .map((candidate) => ({
          candidate,
          match: calculateMatchScore(job, candidate),
        }))
        .sort((a, b) => b.match.score - a.match.score);
      return { job, matches };
    })
  ), [jobOffers]);

  const getMatchDisplayScore = (job, candidate, score) => {
    if (candidate.name === "Maria Santos" && job.title === "WordPress & Webflow Developer") {
      return 90;
    }
    return score;
  };

  useEffect(() => {
    if (shouldForceValidation && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("validate");
      window.history.replaceState({}, "", url.toString());
    }
    if (!session?.employerNeedsValidation) return;
    const updatedSession = { ...session, employerNeedsValidation: false };
    setSession(updatedSession);
    setSessionState(updatedSession);
  }, [session, shouldForceValidation]);

  const errors = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      companyEmail: formData.companyEmail.length === 0
        ? "Company email is required"
        : !emailRegex.test(formData.companyEmail)
          ? "Enter a valid email"
          : "",
      password: formData.password.length < 8 ? "Minimum 8 characters" : "",
      confirmPassword: formData.confirmPassword !== formData.password ? "Passwords do not match" : "",
      companyName: formData.companyName.length === 0 ? "Company name is required" : "",
      industry: formData.industry.length === 0 ? "Select an industry" : "",
      companySize: formData.companySize.length === 0 ? "Select a company size" : "",
      locationCity: formData.locationCity.length === 0 ? "City is required" : "",
      locationRegion: formData.locationRegion.length === 0 ? "Region is required" : "",
      recruiterName: formData.recruiterName.length === 0 ? "Recruiter name is required" : "",
      recruiterPosition: formData.recruiterPosition.length === 0 ? "Position is required" : "",
      recruiterContact: formData.recruiterContact.length === 0 ? "Contact is required" : "",
      businessPermit: formData.businessPermit.length === 0 ? "Business permit is required" : "",
      emailVerified: !formData.emailVerified ? "Company email must be verified" : "",
    };
  }, [formData]);

  const isFormValid = useMemo(() => {
    return (
      !errors.companyEmail &&
      !errors.password &&
      !errors.confirmPassword &&
      !errors.companyName &&
      !errors.industry &&
      !errors.companySize &&
      !errors.locationCity &&
      !errors.locationRegion &&
      !errors.recruiterName &&
      !errors.recruiterPosition &&
      !errors.recruiterContact &&
      !errors.businessPermit &&
      !errors.emailVerified
    );
  }, [errors]);

  const handleFieldChange = (field) => (event) => {
    const nextValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const handlePermitChange = (event) => {
    const file = event.target.files && event.target.files[0];
    setFormData((prev) => ({
      ...prev,
      businessPermit: file ? file.name : "",
    }));
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    if (!isFormValid) return;

    const employerProfile = {
      companyEmail: formData.companyEmail.trim(),
      companyName: formData.companyName.trim(),
      industry: formData.industry,
      companySize: formData.companySize,
      locationCity: formData.locationCity.trim(),
      locationRegion: formData.locationRegion.trim(),
      recruiterName: formData.recruiterName.trim(),
      recruiterPosition: formData.recruiterPosition.trim(),
      recruiterContact: formData.recruiterContact.trim(),
      businessPermit: formData.businessPermit.trim(),
      emailVerified: formData.emailVerified,
      updatedAt: new Date().toISOString(),
    };

    const updatedSession = {
      ...session,
      role: "employer",
      employerProfile,
      employerNeedsValidation: false,
    };

    setSession(updatedSession);
    setSessionState(updatedSession);
    setIsEditingProfile(false);
  };

  const jobFormErrors = useMemo(() => {
    return {
      title: jobForm.title.trim().length === 0 ? "Job title is required" : "",
      locationCity: jobForm.locationCity.trim().length === 0 ? "City is required" : "",
      employmentType: jobForm.employmentType.length === 0 ? "Select employment type" : "",
      workSetup: jobForm.workSetup.length === 0 ? "Select work setup" : "",
      description: jobForm.description.trim().length === 0 ? "Job description is required" : "",
      responsibilities: jobForm.responsibilities.trim().length === 0 ? "Responsibilities are required" : "",
      requiredSkills: jobForm.requiredSkills.trim().length === 0 ? "Required skills are required" : "",
    };
  }, [jobForm]);

  const isJobFormValid = useMemo(() => {
    return (
      !jobFormErrors.title &&
      !jobFormErrors.locationCity &&
      !jobFormErrors.employmentType &&
      !jobFormErrors.workSetup &&
      !jobFormErrors.description &&
      !jobFormErrors.responsibilities &&
      !jobFormErrors.requiredSkills
    );
  }, [jobFormErrors]);

  const handleJobFieldChange = (field) => (event) => {
    setJobForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleJobSubmit = (event) => {
    event.preventDefault();
    if (!isJobFormValid) return;

    const requiredSkills = parseTagInput(jobForm.requiredSkills);
    const preferredSkills = parseTagInput(jobForm.preferredSkills);
    const newJob = {
      id: `job-${Date.now()}`,
      title: jobForm.title.trim(),
      locationCity: jobForm.locationCity.trim(),
      locationRegion: jobForm.locationRegion.trim(),
      employmentType: jobForm.employmentType,
      workSetup: jobForm.workSetup,
      salaryRange: jobForm.salaryRange.trim(),
      description: jobForm.description.trim(),
      responsibilities: jobForm.responsibilities.trim(),
      requiredSkills,
      preferredSkills,
      experienceLevel: jobForm.experienceLevel,
      educationRequirement: jobForm.educationRequirement.trim(),
      closingDate: jobForm.closingDate,
      status: "Open",
      applicants: 0,
      postedAt: new Date().toISOString().slice(0, 10),
    };

    const nextJobs = [newJob, ...jobOffers];
    setJobOffers(nextJobs);

    const updatedSession = {
      ...(session || {}),
      role: "employer",
      employerProfile: existingProfile,
      employerJobs: nextJobs,
      employerAssessments: assessments,
    };

    setSession(updatedSession);
    setSessionState(updatedSession);
    setJobForm({
      title: "",
      locationCity: existingProfile.locationCity || "",
      locationRegion: existingProfile.locationRegion || "",
      employmentType: "Full-time",
      workSetup: "On-site",
      salaryRange: "",
      description: "",
      responsibilities: "",
      requiredSkills: "",
      preferredSkills: "",
      experienceLevel: "Entry",
      educationRequirement: "",
      closingDate: "",
    });
    setIsJobModalOpen(false);
    setTab("job-offers");
  };

  const assessmentFormErrors = useMemo(() => {
    const questionCount = Number(assessmentForm.questionCount);
    const durationMinutes = Number(assessmentForm.durationMinutes);
    const passingScore = Number(assessmentForm.passingScore);
    return {
      title: assessmentForm.title.trim().length === 0 ? "Assessment title is required" : "",
      role: assessmentForm.role.trim().length === 0 ? "Target role is required" : "",
      questionCount: Number.isNaN(questionCount) || questionCount <= 0 ? "Enter a valid number" : "",
      durationMinutes: Number.isNaN(durationMinutes) || durationMinutes <= 0 ? "Enter a valid duration" : "",
      passingScore: Number.isNaN(passingScore) || passingScore < 1 || passingScore > 100 ? "Enter 1-100" : "",
    };
  }, [assessmentForm]);

  const isAssessmentFormValid = useMemo(() => {
    return (
      !assessmentFormErrors.title &&
      !assessmentFormErrors.role &&
      !assessmentFormErrors.questionCount &&
      !assessmentFormErrors.durationMinutes &&
      !assessmentFormErrors.passingScore
    );
  }, [assessmentFormErrors]);

  const handleAssessmentFieldChange = (field) => (event) => {
    setAssessmentForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleAssessmentSubmit = (event) => {
    event.preventDefault();
    if (!isAssessmentFormValid) return;

    const newAssessment = {
      id: `assessment-${Date.now()}`,
      title: assessmentForm.title.trim(),
      role: assessmentForm.role.trim(),
      questionCount: Number(assessmentForm.questionCount),
      durationMinutes: Number(assessmentForm.durationMinutes),
      passingScore: Number(assessmentForm.passingScore),
      instructions: assessmentForm.instructions.trim(),
      status: "Active",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const nextAssessments = [newAssessment, ...assessments];
    setAssessments(nextAssessments);

    const updatedSession = {
      ...(session || {}),
      role: "employer",
      employerProfile: existingProfile,
      employerJobs: jobOffers,
      employerAssessments: nextAssessments,
    };

    setSession(updatedSession);
    setSessionState(updatedSession);
    setAssessmentForm({
      title: "",
      role: "",
      questionCount: "10",
      durationMinutes: "20",
      passingScore: "70",
      instructions: "",
    });
    setIsAssessmentModalOpen(false);
    setTab("assessments");
  };

  if (isEditingProfile) {
    return (
      <div style={{ padding: "28px 32px" }}>
        <div style={{
          background: COLORS.cream,
          borderRadius: 20,
          border: `1px solid ${COLORS.parchmentDeep}`,
          padding: "28px 30px",
          maxWidth: 860,
          margin: "0 auto",
          boxShadow: "0 18px 40px rgba(30, 14, 4, 0.08)",
        }}>
          <div style={{
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLORS.rust,
            fontWeight: 700,
          }}>
            Company profile
          </div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            margin: "10px 0 6px",
            color: COLORS.brownDeep,
          }}>
            Update your company profile
          </h2>
          <p style={{ margin: 0, color: COLORS.textMid, fontSize: 13 }}>
            Keep your company details accurate for your employer dashboard and job postings.
          </p>

          <form onSubmit={handleProfileSubmit} style={{ marginTop: 24, display: "grid", gap: 18 }}>
            <section style={{
              background: COLORS.parchment,
              borderRadius: 16,
              padding: "20px 22px",
              border: `1px solid ${COLORS.parchmentDeep}`,
              display: "grid",
              gap: 14,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.brownDeep,
              }}>
                Step 1: Account Basics
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>
                    Company Email (preferably domain email)
                  </span>
                  <input
                    type="email"
                    value={formData.companyEmail}
                    onChange={handleFieldChange("companyEmail")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {errors.companyEmail && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.companyEmail}</span>
                  )}
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Password</span>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={handleFieldChange("password")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.password && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.password}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Confirm Password</span>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleFieldChange("confirmPassword")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.confirmPassword && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.confirmPassword}</span>
                    )}
                  </label>
                </div>
              </div>
            </section>

            <section style={{
              background: COLORS.cream,
              borderRadius: 16,
              padding: "20px 22px",
              border: `1px solid ${COLORS.parchmentDeep}`,
              display: "grid",
              gap: 14,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.brownDeep,
              }}>
                Step 2: Company Information (Important)
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Company Name</span>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={handleFieldChange("companyName")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {errors.companyName && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.companyName}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Industry</span>
                  <select
                    value={formData.industry}
                    onChange={handleFieldChange("industry")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <option value="">Select industry</option>
                    {industryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.industry && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.industry}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Company Size</span>
                  <select
                    value={formData.companySize}
                    onChange={handleFieldChange("companySize")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <option value="">Select size</option>
                    {companySizeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.companySize && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.companySize}</span>
                  )}
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Location (City)</span>
                    <input
                      type="text"
                      value={formData.locationCity}
                      onChange={handleFieldChange("locationCity")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.locationCity && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.locationCity}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Location (Region)</span>
                    <input
                      type="text"
                      value={formData.locationRegion}
                      onChange={handleFieldChange("locationRegion")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.locationRegion && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.locationRegion}</span>
                    )}
                  </label>
                </div>
              </div>
            </section>

            <section style={{
              background: COLORS.parchment,
              borderRadius: 16,
              padding: "20px 22px",
              border: `1px solid ${COLORS.parchmentDeep}`,
              display: "grid",
              gap: 14,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.brownDeep,
              }}>
                Step 3: Recruiter Information
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Full Name</span>
                  <input
                    type="text"
                    value={formData.recruiterName}
                    onChange={handleFieldChange("recruiterName")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {errors.recruiterName && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.recruiterName}</span>
                  )}
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Position</span>
                    <input
                      type="text"
                      value={formData.recruiterPosition}
                      onChange={handleFieldChange("recruiterPosition")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.recruiterPosition && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.recruiterPosition}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Contact</span>
                    <input
                      type="text"
                      value={formData.recruiterContact}
                      onChange={handleFieldChange("recruiterContact")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {errors.recruiterContact && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.recruiterContact}</span>
                    )}
                  </label>
                </div>
              </div>
            </section>

            <section style={{
              background: COLORS.cream,
              borderRadius: 16,
              padding: "20px 22px",
              border: `1px solid ${COLORS.parchmentDeep}`,
              display: "grid",
              gap: 14,
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.brownDeep,
              }}>
                Step 4: Verification
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Business Permit / Registration</span>
                  <input
                    type="file"
                    onChange={handlePermitChange}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {formData.businessPermit && (
                    <span style={{ fontSize: 11, color: COLORS.textMid }}>Selected: {formData.businessPermit}</span>
                  )}
                  {errors.businessPermit && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.businessPermit}</span>
                  )}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={formData.emailVerified}
                    onChange={handleFieldChange("emailVerified")}
                  />
                  <span style={{ fontSize: 12, color: COLORS.textMid }}>Company Email Verified</span>
                </label>
                {errors.emailVerified && (
                  <span style={{ fontSize: 11, color: COLORS.rust }}>{errors.emailVerified}</span>
                )}
              </div>
            </section>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={!isFormValid}
                style={{
                  padding: "12px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: isFormValid ? COLORS.rust : COLORS.parchmentDeep,
                  color: COLORS.cream,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isFormValid ? "pointer" : "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Submit and continue
              </button>
              {existingProfile.companyName && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 10,
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    background: "transparent",
                    color: COLORS.brownDeep,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Back to dashboard
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding:"12px 16px", maxWidth:1280, width:"100%", margin:"0 auto", display:"grid", gap:16 }}>
      <div style={{
        background:`linear-gradient(135deg, ${COLORS.brownDeep} 0%, ${COLORS.brownMid} 55%, ${COLORS.rust} 100%)`,
        borderRadius:16, padding:"20px 24px", color:COLORS.cream,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        gap:16, flexWrap:"wrap", border:"1px solid rgba(200,144,32,0.25)",
        boxShadow:"0 18px 40px rgba(30, 14, 4, 0.2)"
      }}>
        <div>
          <div style={{
            fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase",
            color:COLORS.goldLight, fontWeight:700
          }}>Employer workspace</div>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, margin:"6px 0 4px", color:COLORS.cream }}>
            {existingProfile.companyName || "NovaByte Solutions"}
          </h2>
          <p style={{ color:"rgba(253,246,232,0.7)", fontSize:12, margin:0 }}>
            Starter Plan · 4 active roles · 42 applicants this month
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button style={{
            padding:"9px 16px", borderRadius:9,
            background:`linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldLight})`,
            border:"none", color:COLORS.brownDeep, fontWeight:700, fontSize:12,
            cursor:"pointer", fontFamily:"'DM Sans', sans-serif"
          }} onClick={() => setIsJobModalOpen(true)}>+ Post new job</button>
          <button style={{
            padding:"9px 16px", borderRadius:9,
            background:"rgba(253,246,232,0.1)", border:"1px solid rgba(253,246,232,0.3)",
            color:COLORS.cream, fontWeight:600, fontSize:12,
            cursor:"pointer", fontFamily:"'DM Sans', sans-serif"
          }} onClick={() => setIsInviteModalOpen(true)}>Invite candidate</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10 }}>
        {statStrip.map((stat) => (
          <div key={stat.label} style={{
            background: COLORS.parchment,
            borderRadius: 8,
            padding: "12px 14px",
            border: `1px solid ${COLORS.parchmentDeep}`,
          }}>
            <div style={{ fontSize: 11, color: COLORS.textMid, marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>{stat.helper}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16, alignItems:"start" }}>
        <div style={{ display:"grid", gap:12 }}>
          <div style={{
            background: COLORS.cream,
            borderRadius: 12,
            border: `1px solid ${COLORS.parchmentDeep}`,
            padding: "14px 16px",
            display: "grid",
            gap: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textLight }}>
              Company overview
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>
              NovaByte Solutions
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              IT Services & Web Development · Founded 2021
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              Davao City, Philippines · 18-25 employees
            </div>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              NovaByte Solutions builds e-commerce sites, dashboards, and custom web apps for SMEs across retail, food service, and logistics.
            </p>
          </div>
          <div style={{
            background: COLORS.cream,
            borderRadius: 12,
            border: `1px solid ${COLORS.parchmentDeep}`,
            padding: "14px 16px",
            display: "grid",
            gap: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textLight }}>
              Company profile
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>
              {existingProfile.companyName || "NovaByte Solutions"}
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              {existingProfile.industry || "IT Services & Web Development"} · {existingProfile.locationCity || "Davao City"}
              <br />
              {(existingProfile.companySize || "18-25")} employees
            </div>
            <div style={{ height: 1, background: COLORS.parchmentDeep, opacity: 0.7 }} />
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${COLORS.parchmentDeep}`,
                background: "transparent",
                color: COLORS.brownDeep,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                width: "100%",
              }}
            >
              Edit profile
            </button>
          </div>

          <div style={{
            background: COLORS.cream,
            borderRadius: 12,
            border: "1px solid rgba(193, 68, 14, 0.25)",
            padding: "14px 16px",
            display: "grid",
            gap: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textLight }}>
              Employer premium
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              Unlock advanced tools to screen faster.
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {premiumBenefits.map((benefit) => (
                <div key={benefit} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11, color: COLORS.textMid }}>
                  <span style={{ color: COLORS.success, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: COLORS.rust,
                color: COLORS.cream,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                width: "100%",
              }}
            >
              Upgrade to premium
            </button>
            <button
              type="button"
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${COLORS.parchmentDeep}`,
                background: "transparent",
                color: COLORS.brownDeep,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                width: "100%",
              }}
            >
              View plan details
            </button>
          </div>
        </div>

        <div>
          <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${COLORS.parchmentDeep}`, marginBottom:16, overflowX:"auto" }}>
            {["job-offers", "assessments", "matches", "analytics"].map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"9px 16px", border:"none", background:"transparent", fontSize:13,
                fontWeight: tab===t ? 600 : 400, color: tab===t ? COLORS.rust : COLORS.textLight,
                borderBottom: tab===t ? `2px solid ${COLORS.rust}` : "2px solid transparent",
                cursor:"pointer", fontFamily:"'DM Sans', sans-serif", textTransform:"capitalize", whiteSpace:"nowrap"
              }}>{t.replace('-', ' ')}</button>
            ))}
          </div>

          {tab === "job-offers" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Job offers</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
                    Manage active roles and track applicants per role.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(true)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: COLORS.rust,
                    color: COLORS.cream,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  + Post new job
                </button>
              </div>

              {jobOffers.length === 0 ? (
                <div style={{
                  background: COLORS.cream,
                  borderRadius: 12,
                  padding: "18px 20px",
                  border: `1px dashed ${COLORS.parchmentDeep}`,
                  fontSize: 13,
                  color: COLORS.textMid,
                }}>
                  No job offers yet. Post your first role to start receiving applicants.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {jobOffers.map((job) => (
                    <div key={job.id} style={{
                      background: COLORS.cream,
                      borderRadius: 12,
                      padding: "16px 18px",
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      display: "grid",
                      gap: 10,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                            {job.locationCity}{job.locationRegion ? `, ${job.locationRegion}` : ""} · {job.workSetup} · {job.employmentType}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span className="sbph-badge badge-open">{job.status}</span>
                          <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>
                            {job.applicants} applicants
                          </span>
                          {job.salaryRange && (
                            <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>
                              {job.salaryRange}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ height: 1, background: COLORS.parchmentDeep, opacity: 0.7 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 11, color: COLORS.textLight }}>
                          Posted {job.postedAt}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ padding: "6px 12px", borderRadius: 7, background: COLORS.rust, border: "none", color: COLORS.cream, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            View applicants
                          </button>
                          <button style={{ padding: "6px 12px", borderRadius: 7, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, cursor: "pointer" }}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "assessments" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Company assessments</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
                    Build assessments that applicants must complete for your roles.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(true)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: COLORS.rust,
                    color: COLORS.cream,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  + Post assessment
                </button>
              </div>

              {assessments.length === 0 ? (
                <div style={{
                  background: COLORS.cream,
                  borderRadius: 12,
                  padding: "18px 20px",
                  border: `1px dashed ${COLORS.parchmentDeep}`,
                  fontSize: 13,
                  color: COLORS.textMid,
                }}>
                  No assessments yet. Post an assessment to screen applicants by company.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {assessments.map((assessment) => (
                    <div key={assessment.id} style={{
                      background: COLORS.cream,
                      borderRadius: 12,
                      padding: "16px 18px",
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      display: "grid",
                      gap: 10,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{assessment.title}</div>
                          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                            {assessment.role} · {assessment.questionCount} questions · {assessment.durationMinutes} min · Pass {assessment.passingScore}%
                          </div>
                        </div>
                        <span className="sbph-badge badge-open">{assessment.status}</span>
                      </div>
                      {assessment.instructions && (
                        <div style={{ fontSize: 12, color: COLORS.textLight }}>{assessment.instructions}</div>
                      )}
                      <div style={{ height: 1, background: COLORS.parchmentDeep, opacity: 0.7 }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 11, color: COLORS.textLight }}>
                          Created {assessment.createdAt}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ padding: "6px 12px", borderRadius: 7, background: COLORS.rust, border: "none", color: COLORS.cream, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Assign to applicants
                          </button>
                          <button style={{ padding: "6px 12px", borderRadius: 7, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, cursor: "pointer" }}>
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {tab === "matches" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Match recommendations</div>
                <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
                  Smart hiring starts with verified skills (70%+ shown by default).
                </div>
              </div>
              {matchedCandidates.length === 0 ? (
                <div style={{
                  background: COLORS.cream,
                  borderRadius: 12,
                  padding: "18px 20px",
                  border: `1px dashed ${COLORS.parchmentDeep}`,
                  fontSize: 13,
                  color: COLORS.textMid,
                }}>
                  No matches yet. Post a job to see candidate recommendations.
                </div>
              ) : (
                matchedCandidates.map(({ job, matches }) => {
                  const lowMatchCount = matches.filter((entry) => entry.match.score < 70).length;
                  const isExpanded = Boolean(expandedMatchJobs[job.id]);
                  const visibleMatches = isExpanded
                    ? matches
                    : matches.filter((entry) => entry.match.score >= 70);
                  const visibleCount = visibleMatches.length;
                  return (
                    <div key={job.id} style={{
                      background: COLORS.cream,
                      borderRadius: 12,
                      padding: "18px 20px",
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      display: "grid",
                      gap: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                            {getJobLocation(job)} · {job.workSetup} · {job.employmentType}
                          </div>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>
                          {visibleCount} match(es)
                        </span>
                      </div>
                      {visibleCount === 0 ? (
                        <div style={{ fontSize: 12, color: COLORS.textMid }}>
                          No candidates above 70% yet.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {visibleMatches.map(({ candidate, match }) => {
                            const displayScore = getMatchDisplayScore(job, candidate, match.score);
                            return (
                          <div key={`${job.id}-${candidate.id}`} style={{
                            background: COLORS.parchment,
                            borderRadius: 10,
                            padding: "12px 14px",
                            border: `1px solid ${COLORS.parchmentDeep}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${COLORS.rust}, ${COLORS.gold})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#FDF6E8",
                                flexShrink: 0,
                              }}>
                                {candidate.avatar}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{candidate.name}</div>
                                <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{candidate.role} · {candidate.location || "Location"}</div>
                                <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
                                  Matched skills: {match.matchedRequired.length + match.matchedPreferred.length}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ textAlign: "center" }}>
                                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: displayScore >= 85 ? COLORS.success : COLORS.gold }}>
                                  {displayScore}%
                                </div>
                                <div style={{ fontSize: 10, color: COLORS.textLight }}>match</div>
                              </div>
                              <button style={{
                                padding: "6px 12px",
                                borderRadius: 7,
                                background: COLORS.rust,
                                border: "none",
                                color: COLORS.cream,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}>
                                Invite
                              </button>
                            </div>
                          </div>
                            );
                          })}
                        </div>
                      )}
                      {lowMatchCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedMatchJobs((prev) => ({
                            ...prev,
                            [job.id]: !prev[job.id],
                          }))}
                          style={{
                            justifySelf: "flex-start",
                            padding: "6px 12px",
                            borderRadius: 999,
                            background: "transparent",
                            border: `1px solid ${COLORS.parchmentDeep}`,
                            color: COLORS.textMid,
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {isExpanded ? "Hide low matches" : `View ${lowMatchCount} more`}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "analytics" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {([
                { title:"Hiring funnel", data:[["Views","420"],["Applied","64"],["Shortlisted","6"],["Hired","1"]] },
                { title:"Top skill demand", data:[["React","18 applicants"],["Laravel","14 applicants"],["Figma","12 applicants"],["WordPress","10 applicants"]] },
              ]).map(block => (
                <div key={block.title} style={{ background:COLORS.cream, borderRadius:12, padding:"18px", border:`1px solid ${COLORS.parchmentDeep}` }}>
                  <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, color:COLORS.brownDeep, marginBottom:14 }}>{block.title}</h4>
                  {block.data.map(([k,v],i) => {
                    const pct = [100,72,14,2.5][i] ?? 50;
                    return (
                      <div key={k} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:12, color:COLORS.textDark }}>{k}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:COLORS.brownLight }}>{v}</span>
                        </div>
                        <div style={{ background:COLORS.parchmentDeep, borderRadius:6, height:6 }}>
                          <div style={{ width:`${pct}%`, height:"100%", borderRadius:6, background:`linear-gradient(90deg, ${COLORS.rust}, ${COLORS.gold})` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isJobModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsJobModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21, 11, 4, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 50,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: COLORS.cream,
              borderRadius: 16,
              padding: "22px 24px",
              width: "min(680px, 100%)",
              border: `1px solid ${COLORS.parchmentDeep}`,
              boxShadow: "0 22px 60px rgba(30, 14, 4, 0.28)",
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.rust, fontWeight: 700 }}>
                  Post new job
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.brownDeep, marginTop: 6 }}>
                  Create a job offer for your company
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                style={{
                  border: "none",
                  background: COLORS.parchment,
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: COLORS.textMid,
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleJobSubmit} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Job Title</span>
                  <input
                    type="text"
                    value={jobForm.title}
                    onChange={handleJobFieldChange("title")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {jobFormErrors.title && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.title}</span>
                  )}
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>City</span>
                    <input
                      type="text"
                      value={jobForm.locationCity}
                      onChange={handleJobFieldChange("locationCity")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {jobFormErrors.locationCity && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.locationCity}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Region (optional)</span>
                    <input
                      type="text"
                      value={jobForm.locationRegion}
                      onChange={handleJobFieldChange("locationRegion")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Job Type</span>
                    <select
                      value={jobForm.employmentType}
                      onChange={handleJobFieldChange("employmentType")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="">Select type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                    {jobFormErrors.employmentType && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.employmentType}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Work Setup</span>
                    <select
                      value={jobForm.workSetup}
                      onChange={handleJobFieldChange("workSetup")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="">Select setup</option>
                      <option value="On-site">On-site</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                    {jobFormErrors.workSetup && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.workSetup}</span>
                    )}
                  </label>
                </div>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Experience Level</span>
                    <select
                      value={jobForm.experienceLevel}
                      onChange={handleJobFieldChange("experienceLevel")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="Entry">Entry</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Education (optional)</span>
                    <input
                      type="text"
                      value={jobForm.educationRequirement}
                      onChange={handleJobFieldChange("educationRequirement")}
                      placeholder="e.g. College level"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  </label>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Required Skills (comma-separated)</span>
                  <input
                    type="text"
                    value={jobForm.requiredSkills}
                    onChange={handleJobFieldChange("requiredSkills")}
                    placeholder="Customer Service, Communication"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {jobFormErrors.requiredSkills && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.requiredSkills}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Preferred Skills (comma-separated)</span>
                  <input
                    type="text"
                    value={jobForm.preferredSkills}
                    onChange={handleJobFieldChange("preferredSkills")}
                    placeholder="CRM, Problem Solving"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Salary Range (optional)</span>
                  <input
                    type="text"
                    value={jobForm.salaryRange}
                    onChange={handleJobFieldChange("salaryRange")}
                    placeholder="PHP 20k-30k"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Responsibilities</span>
                  <textarea
                    rows={3}
                    value={jobForm.responsibilities}
                    onChange={handleJobFieldChange("responsibilities")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                    }}
                  />
                  {jobFormErrors.responsibilities && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.responsibilities}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Job Description</span>
                  <textarea
                    rows={3}
                    value={jobForm.description}
                    onChange={handleJobFieldChange("description")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                    }}
                  />
                  {jobFormErrors.description && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{jobFormErrors.description}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6, maxWidth: 240 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Closing Date (optional)</span>
                  <input
                    type="date"
                    value={jobForm.closingDate}
                    onChange={handleJobFieldChange("closingDate")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 9,
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    background: "transparent",
                    color: COLORS.brownDeep,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isJobFormValid}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: isJobFormValid ? COLORS.rust : COLORS.parchmentDeep,
                    color: COLORS.cream,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: isJobFormValid ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Publish job offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssessmentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAssessmentModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21, 11, 4, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 50,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: COLORS.cream,
              borderRadius: 16,
              padding: "22px 24px",
              width: "min(680px, 100%)",
              border: `1px solid ${COLORS.parchmentDeep}`,
              boxShadow: "0 22px 60px rgba(30, 14, 4, 0.28)",
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.rust, fontWeight: 700 }}>
                  Post assessment
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.brownDeep, marginTop: 6 }}>
                  Create a company assessment
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssessmentModalOpen(false)}
                style={{
                  border: "none",
                  background: COLORS.parchment,
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: COLORS.textMid,
                  fontWeight: 700,
                }}
              >
                x
              </button>
            </div>

            <form onSubmit={handleAssessmentSubmit} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Assessment Title</span>
                  <input
                    type="text"
                    value={assessmentForm.title}
                    onChange={handleAssessmentFieldChange("title")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {assessmentFormErrors.title && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{assessmentFormErrors.title}</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Target Role</span>
                  <input
                    type="text"
                    value={assessmentForm.role}
                    onChange={handleAssessmentFieldChange("role")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                  {assessmentFormErrors.role && (
                    <span style={{ fontSize: 11, color: COLORS.rust }}>{assessmentFormErrors.role}</span>
                  )}
                </label>
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Questions</span>
                    <input
                      type="number"
                      min="1"
                      value={assessmentForm.questionCount}
                      onChange={handleAssessmentFieldChange("questionCount")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {assessmentFormErrors.questionCount && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{assessmentFormErrors.questionCount}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Duration (minutes)</span>
                    <input
                      type="number"
                      min="1"
                      value={assessmentForm.durationMinutes}
                      onChange={handleAssessmentFieldChange("durationMinutes")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {assessmentFormErrors.durationMinutes && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{assessmentFormErrors.durationMinutes}</span>
                    )}
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Passing Score (%)</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={assessmentForm.passingScore}
                      onChange={handleAssessmentFieldChange("passingScore")}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                        background: COLORS.cream,
                        fontSize: 13,
                        color: COLORS.textDark,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                    {assessmentFormErrors.passingScore && (
                      <span style={{ fontSize: 11, color: COLORS.rust }}>{assessmentFormErrors.passingScore}</span>
                    )}
                  </label>
                </div>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Instructions (optional)</span>
                  <textarea
                    rows={3}
                    value={assessmentForm.instructions}
                    onChange={handleAssessmentFieldChange("instructions")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${COLORS.parchmentDeep}`,
                      background: COLORS.cream,
                      fontSize: 13,
                      color: COLORS.textDark,
                      fontFamily: "'DM Sans', sans-serif",
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 9,
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    background: "transparent",
                    color: COLORS.brownDeep,
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isAssessmentFormValid}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 9,
                    border: "none",
                    background: isAssessmentFormValid ? COLORS.rust : COLORS.parchmentDeep,
                    color: COLORS.cream,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: isAssessmentFormValid ? "pointer" : "not-allowed",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Publish assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsInviteModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21, 11, 4, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 50,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: COLORS.cream,
              borderRadius: 16,
              padding: "22px 24px",
              width: "min(760px, 100%)",
              border: `1px solid ${COLORS.parchmentDeep}`,
              boxShadow: "0 22px 60px rgba(30, 14, 4, 0.28)",
              display: "grid",
              gap: 16,
              maxHeight: "80vh",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.rust, fontWeight: 700 }}>
                  Invite candidates
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.brownDeep, marginTop: 6 }}>
                  Top 10 applicant suggestions
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                style={{
                  border: "none",
                  background: COLORS.parchment,
                  borderRadius: 999,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  color: COLORS.textMid,
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: 10, overflowY: "auto", paddingRight: 6 }}>
              {topCandidates.map((candidate) => (
                <div key={candidate.id} style={{
                  background: COLORS.parchment,
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: `1px solid ${COLORS.parchmentDeep}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${COLORS.rust}, ${COLORS.gold})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#FDF6E8",
                      flexShrink: 0,
                    }}>
                      {candidate.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{candidate.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{candidate.role}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {candidate.skills.slice(0, 3).map((skill) => (
                          <span key={skill} style={{
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: COLORS.cream,
                            fontSize: 10,
                            color: COLORS.textMid,
                            border: `1px solid ${COLORS.parchmentDeep}`,
                          }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, color: candidate.score >= 90 ? COLORS.success : COLORS.gold }}>
                        {candidate.score}%
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.textLight }}>skill score</div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 7,
                        background: COLORS.rust,
                        border: "none",
                        color: COLORS.cream,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Invite
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
