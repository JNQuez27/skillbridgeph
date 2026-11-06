import { useMemo, useState } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import Card from "../JobSeeker/components/ui/Card";
import Input from "../JobSeeker/components/ui/Input";
import Select from "../JobSeeker/components/ui/Select";
import Button from "../JobSeeker/components/ui/Button";
import Badge from "../JobSeeker/components/ui/Badge";
import ProgressBar from "../JobSeeker/components/ui/ProgressBar";
import FlashBanner from "../JobSeeker/components/ui/FlashBanner";

const steps = [
  { key: "company", title: "Company" },
  { key: "recruiter", title: "Recruiter" },
  { key: "verify", title: "Verification" },
];

const industryOptions = [
  { value: "", label: "Select industry" },
  { value: "Retail", label: "Retail" },
  { value: "Food & Beverage", label: "Food & Beverage" },
  { value: "BPO / Services", label: "BPO / Services" },
  { value: "Information Technology", label: "Information Technology" },
  { value: "Creative & Media", label: "Creative & Media" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Other", label: "Other" },
];

const sizeOptions = [
  { value: "", label: "Select company size" },
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

export default function EmployerOnboarding() {
  const { props } = usePage();
  const user = props.auth?.user || null;
  const [stepIndex, setStepIndex] = useState(0);

  const { data, setData, put, processing, errors } = useForm({
    companyName: user?.name ? `${user.name}'s Company` : "",
    industry: "",
    companySize: "",
    locationCity: "",
    locationRegion: "",
    recruiterName: user?.name || "",
    recruiterPosition: "",
    recruiterContact: "",
    attested: false, // confirmation only; verification is granted by SkillBridge PH
  });

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const isStepValid = useMemo(() => {
    if (stepIndex === 0) return data.companyName.trim().length > 0;
    if (stepIndex === 1) return data.recruiterName.trim().length > 0;
    return data.attested; // must confirm the details are accurate
  }, [data, stepIndex]);

  const submit = () => {
    put("/employer-profile", {
      preserveScroll: true,
      onSuccess: () => router.visit("/dashboard"),
    });
  };

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-8 font-sans text-slate-800">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-700">SkillBridge PH</p>
          <h1 className="mt-2 text-3xl font-semibold text-sky-900">Employer Onboarding</h1>
          <p className="mt-2 text-sm text-slate-500">
            Set up your company background and verify your business so candidates can trust your roles.
          </p>
        </div>
        <FlashBanner />

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
            <Input
              id="company-name"
              label="Company name"
              placeholder="e.g. MetroMarket Inc."
              value={data.companyName}
              onChange={(event) => setData("companyName", event.target.value)}
              error={errors.companyName}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="company-industry"
                label="Industry"
                value={data.industry}
                onChange={(event) => setData("industry", event.target.value)}
                options={industryOptions}
              />
              <Select
                id="company-size"
                label="Company size"
                value={data.companySize}
                onChange={(event) => setData("companySize", event.target.value)}
                options={sizeOptions}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="company-city"
                label="City"
                placeholder="Quezon City"
                value={data.locationCity}
                onChange={(event) => setData("locationCity", event.target.value)}
              />
              <Input
                id="company-region"
                label="Region"
                placeholder="Metro Manila"
                value={data.locationRegion}
                onChange={(event) => setData("locationRegion", event.target.value)}
              />
            </div>
          </Card>
        )}

        {stepIndex === 1 && (
          <Card className="space-y-4">
            <Input
              id="recruiter-name"
              label="Recruiter name"
              placeholder="Andrea Santos"
              value={data.recruiterName}
              onChange={(event) => setData("recruiterName", event.target.value)}
              error={errors.recruiterName}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="recruiter-position"
                label="Position"
                placeholder="HR Lead"
                value={data.recruiterPosition}
                onChange={(event) => setData("recruiterPosition", event.target.value)}
              />
              <Input
                id="recruiter-contact"
                label="Contact"
                placeholder="Mobile number or email"
                value={data.recruiterContact}
                onChange={(event) => setData("recruiterContact", event.target.value)}
              />
            </div>
          </Card>
        )}

        {stepIndex === 2 && (
          <Card className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Review your company</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <div className="flex justify-between gap-4"><span className="text-slate-400">Company</span><span className="font-medium text-slate-700">{data.companyName || "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Industry</span><span className="font-medium text-slate-700">{data.industry || "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Size</span><span className="font-medium text-slate-700">{data.companySize || "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Location</span><span className="font-medium text-slate-700">{[data.locationCity, data.locationRegion].filter(Boolean).join(", ") || "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-400">Recruiter</span><span className="font-medium text-slate-700">{data.recruiterName || "—"}</span></div>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={data.attested}
                onChange={(event) => setData("attested", event.target.checked)}
              />
              <span>
                <span className="font-semibold text-sky-800">I confirm these details.</span>{" "}
                The company details above are accurate and I'm authorized to hire on its behalf. SkillBridge PH then checks the
                business before marking it <strong>Verified</strong>; only verified companies can issue skill badges.
              </span>
            </label>
            {!isStepValid && (
              <p className="text-xs text-slate-400">Confirm the details to finish onboarding.</p>
            )}
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
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-xs font-medium text-slate-500 hover:text-sky-700">
              Skip for now
            </a>
            {stepIndex < steps.length - 1 ? (
              <Button type="button" disabled={!isStepValid} onClick={() => setStepIndex((prev) => prev + 1)}>
                Continue
              </Button>
            ) : (
              <Button type="button" loading={processing} disabled={!isStepValid || processing} onClick={submit}>
                Finish & go to dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
