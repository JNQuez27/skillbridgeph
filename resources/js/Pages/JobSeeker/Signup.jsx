import { useForm } from "@inertiajs/react";
import AuthLayout, { PANELS } from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

const COPY = {
  jobseeker: { title: "Make your next move.", subtitle: "Create a free job seeker account.", emailLabel: "Email address", emailPlaceholder: "you@email.com" },
  employer: { title: "Find your next great hire.", subtitle: "Create your employer account.", emailLabel: "Work email", emailPlaceholder: "you@company.ph" },
};

export default function Signup() {
  const { data, setData, post, processing, errors } = useForm({
    // "Post a job" links arrive with ?role=employer preselected.
    role: new URLSearchParams(window.location.search).get("role") === "employer" ? "employer" : "jobseeker",
    fullName: "",
    companyName: "",
    email: "",
    password: "",
    acceptPrivacy: false,
  });

  const submit = (event) => {
    event.preventDefault();
    post("/register");
  };

  const isEmployer = data.role === "employer";
  const copy = COPY[data.role];
  const nameError = errors.firstName || errors.surname;

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle} panel={PANELS[data.role]}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-1 rounded-full border border-[#F3D89B] bg-[#FFF6E3] p-1">
          {[["jobseeker", "Job seeker"], ["employer", "Employer"]].map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={data.role === value}
              onClick={() => setData("role", value)}
              className={`min-h-10 rounded-full text-sm font-semibold transition ${data.role === value ? "bg-[#ECA406] text-neutral-900 shadow-sm" : "bg-white text-neutral-700 hover:bg-[#FFF6E0]"}`}>
              {label}
            </button>
          ))}
        </div>
        {errors.role && <p role="alert" className="text-xs text-rose-600">{errors.role}</p>}

        <Input id="signup-full-name" label="Full name" placeholder={isEmployer ? "Paolo Reyes" : "Mika Santos"} autoComplete="name"
          value={data.fullName} onChange={(e) => setData("fullName", e.target.value)} error={nameError} />
        {isEmployer && (
          <Input id="signup-company" label="Company name" placeholder="Kubo Digital" autoComplete="organization"
            value={data.companyName} onChange={(e) => setData("companyName", e.target.value)} error={errors.companyName} />
        )}
        <Input id="signup-email" label={copy.emailLabel} type="email" placeholder={copy.emailPlaceholder} autoComplete="email"
          value={data.email} onChange={(e) => setData("email", e.target.value)} error={errors.email} />
        <Input id="signup-password" label="Password" type="password" autoComplete="new-password"
          hint="At least 8 characters, including a number."
          value={data.password} onChange={(e) => setData("password", e.target.value)} error={errors.password} />

        <label className="flex items-start gap-3 text-xs text-neutral-700">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ECA406]" checked={data.acceptPrivacy}
            onChange={(e) => setData("acceptPrivacy", e.target.checked)} />
          <span>
            I agree to the Terms of Service and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-neutral-900 underline">Privacy Policy</a>.
          </span>
        </label>
        {errors.acceptPrivacy && <p role="alert" className="text-xs text-rose-600">Please accept the Privacy Policy to create an account.</p>}

        <Button type="submit" loading={processing} disabled={processing || !data.acceptPrivacy} className="w-fit px-6">
          Create my account →
        </Button>
        <p className="text-xs text-neutral-600">
          Already registered?{" "}
          <a className="font-semibold text-neutral-900 underline" href="/login">Log in</a>
        </p>
      </form>
    </AuthLayout>
  );
}
