import { useMemo, useState } from "react";
import Button from "./components/ui/Button";
import Card from "./components/ui/Card";
import Input from "./components/ui/Input";
import Badge from "./components/ui/Badge";
import ProgressBar from "./components/ui/ProgressBar";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";
import { skillOptions } from "./data/jobSeekerData";
import { useRequireAuth } from "./hooks/useAuth";
import { getSession, setSession } from "./hooks/useSession";

const steps = [
  { key: "basic", title: "Basic Info" },
  { key: "skills", title: "Skills" },
  { key: "education", title: "Education" },
  { key: "experience", title: "Experience" },
  { key: "portfolio", title: "Portfolio" },
  { key: "review", title: "Review" },
];

function OnboardingContent() {
  useRequireAuth();
  const { addToast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [skillSearch, setSkillSearch] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    avatarUrl: "",
    bio: "",
    location: "",
    contact: "",
    skills: [],
    education: { school: "", degree: "", year: "" },
    experience: { title: "", company: "", description: "" },
    experienceLevel: "",
    portfolio: [""],
    completedAssessmentsInput: "",
    verifiedBadgesInput: "",
  });

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const filteredSkills = useMemo(() => {
    return skillOptions.filter((skill) =>
      skill.toLowerCase().includes(skillSearch.toLowerCase())
    );
  }, [skillSearch]);

  const handleAvatarChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, avatarUrl: nextUrl }));
  };

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((item) => item !== skill)
          : [...prev.skills, skill],
      };
    });
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (!formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setCustomSkill("");
  };

  const updatePortfolio = (index, value) => {
    setFormData((prev) => {
      const nextPortfolio = [...prev.portfolio];
      nextPortfolio[index] = value;
      return { ...prev, portfolio: nextPortfolio };
    });
  };

  const parseListInput = (value) => value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const isStepValid = useMemo(() => {
    const { bio, skills, education, portfolio, location, contact, experienceLevel, completedAssessmentsInput, verifiedBadgesInput } = formData;
    if (stepIndex === 0) return bio.length > 0 && bio.length <= 150 && location.trim().length > 0 && contact.trim().length > 0;
    if (stepIndex === 1) return skills.length > 0;
    if (stepIndex === 2) return education.school && education.degree && education.year;
    if (stepIndex === 3) return experienceLevel.trim().length > 0;
    if (stepIndex === 4) {
      const hasPortfolio = portfolio.some((link) => link.trim().length > 0);
      const hasAssessments = completedAssessmentsInput.trim().length > 0;
      const hasBadges = verifiedBadgesInput.trim().length > 0;
      return hasPortfolio || hasAssessments || hasBadges;
    }
    return true;
  }, [formData, stepIndex]);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      const currentSession = getSession();
      const applicantProfile = {
        name: currentSession?.name || "",
        location: formData.location.trim(),
        contact: formData.contact.trim(),
        skills: formData.skills,
        experience: {
          ...formData.experience,
          level: formData.experienceLevel,
        },
        education: formData.education,
        portfolio: formData.portfolio.filter((link) => link.trim().length > 0),
        completedAssessments: parseListInput(formData.completedAssessmentsInput),
        verifiedBadges: parseListInput(formData.verifiedBadgesInput),
      };
      setSession({
        ...currentSession,
        applicantProfile,
        applicantProfileComplete: true,
      });
      addToast({ message: "Onboarding complete. Welcome aboard!", type: "success" });
      window.location.href = "/dashboard";
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">SkillBridge PH</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Applicant Onboarding</h1>
          <p className="mt-2 text-sm text-slate-500">Complete your profile to get matched with more opportunities.</p>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Step {stepIndex + 1} of {steps.length}</p>
              <p className="text-xs text-slate-500">{steps[stepIndex].title}</p>
            </div>
            <div className="w-full max-w-xs">
              <ProgressBar value={progress} />
              <p className="mt-2 text-xs text-slate-500">{progress}% complete</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <Badge key={step.key} tone={index === stepIndex ? "info" : "default"}>
                {step.title}
              </Badge>
            ))}
          </div>
        </Card>

        {stepIndex === 0 && (
          <Card className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Photo</div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Profile picture</p>
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>
            <Input
              id="onboard-bio"
              label="Short bio"
              placeholder="Tell recruiters about your strengths"
              value={formData.bio}
              onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
              hint={`${formData.bio.length}/150 characters`}
              error={formData.bio.length > 150 ? "Max 150 characters" : ""}
            />
            <Input
              id="onboard-location"
              label="Location"
              placeholder="City, Region"
              value={formData.location}
              onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Input
              id="onboard-contact"
              label="Contact"
              placeholder="Mobile number or email"
              value={formData.contact}
              onChange={(event) => setFormData((prev) => ({ ...prev, contact: event.target.value }))}
            />
          </Card>
        )}

        {stepIndex === 1 && (
          <Card className="space-y-4">
            <Input
              id="skill-search"
              label="Search skills"
              placeholder="Search skills"
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {filteredSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${formData.skills.includes(skill) ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                id="custom-skill"
                label="Add custom skill"
                placeholder="e.g. Event styling"
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addCustomSkill}>
                Add skill
              </Button>
            </div>
          </Card>
        )}

        {stepIndex === 2 && (
          <Card className="space-y-4">
            <Input
              id="education-school"
              label="School name"
              placeholder="University name"
              value={formData.education.school}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, school: event.target.value },
                }))
              }
            />
            <Input
              id="education-degree"
              label="Course or degree"
              placeholder="Course or degree"
              value={formData.education.degree}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, degree: event.target.value },
                }))
              }
            />
            <Input
              id="education-year"
              label="Year completed"
              placeholder="2025"
              value={formData.education.year}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, year: event.target.value },
                }))
              }
            />
          </Card>
        )}

        {stepIndex === 3 && (
          <Card className="space-y-4">
            <Input
              id="experience-title"
              label="Job title"
              placeholder="Sales Associate"
              value={formData.experience.title}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, title: event.target.value },
                }))
              }
            />
            <Input
              id="experience-company"
              label="Company name"
              placeholder="Company name"
              value={formData.experience.company}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, company: event.target.value },
                }))
              }
            />
            <Input
              id="experience-description"
              label="Description"
              placeholder="Highlight your key responsibilities"
              value={formData.experience.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, description: event.target.value },
                }))
              }
            />
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Experience level</span>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={formData.experienceLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, experienceLevel: event.target.value }))}
              >
                <option value="">Select level</option>
                <option value="Entry">Entry</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </label>
          </Card>
        )}

        {stepIndex === 4 && (
          <Card className="space-y-4">
            {formData.portfolio.map((link, index) => (
              <Input
                key={`portfolio-${index}`}
                id={`portfolio-${index}`}
                label={`Portfolio link ${index + 1}`}
                placeholder="https://"
                value={link}
                onChange={(event) => updatePortfolio(index, event.target.value)}
              />
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormData((prev) => ({ ...prev, portfolio: [...prev.portfolio, ""] }))}
            >
              Add another link
            </Button>
            <Input
              id="completed-assessments"
              label="Completed assessments (comma-separated)"
              placeholder="Customer Service Essentials, Retail Ops Basics"
              value={formData.completedAssessmentsInput}
              onChange={(event) => setFormData((prev) => ({ ...prev, completedAssessmentsInput: event.target.value }))}
            />
            <Input
              id="verified-badges"
              label="Verified badges (comma-separated)"
              placeholder="Client Champion, Content Builder"
              value={formData.verifiedBadgesInput}
              onChange={(event) => setFormData((prev) => ({ ...prev, verifiedBadgesInput: event.target.value }))}
            />
          </Card>
        )}

        {stepIndex === 5 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Basic Info</p>
                <p className="text-xs text-slate-500">{formData.bio}</p>
                <p className="mt-1 text-xs text-slate-500">{formData.location} · {formData.contact}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(0)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} tone="info">{skill}</Badge>
                  ))}
                </div>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(1)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Education</p>
                <p className="text-xs text-slate-500">
                  {formData.education.school} - {formData.education.degree} ({formData.education.year})
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(2)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Experience</p>
                <p className="text-xs text-slate-500">{formData.experience.title || "Optional"}</p>
                <p className="mt-1 text-xs text-slate-500">Level: {formData.experienceLevel || "-"}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(3)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Portfolio</p>
                <p className="text-xs text-slate-500">{formData.portfolio.filter(Boolean).join(", ")}</p>
                <p className="mt-1 text-xs text-slate-500">Assessments: {formData.completedAssessmentsInput || "-"}</p>
                <p className="mt-1 text-xs text-slate-500">Badges: {formData.verifiedBadgesInput || "-"}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(4)}>
                Edit
              </Button>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
          >
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button type="button" disabled={!isStepValid} onClick={() => setStepIndex((prev) => prev + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" loading={submitting} onClick={handleSubmit}>
              Submit profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <ToastProvider>
      <OnboardingContent />
    </ToastProvider>
  );
}
