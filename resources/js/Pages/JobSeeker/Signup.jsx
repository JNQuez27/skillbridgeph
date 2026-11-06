import { useForm } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Select from "./components/ui/Select";
import Button from "./components/ui/Button";

const roleOptions = [
  { value: "jobseeker", label: "Applicant" },
  { value: "employer", label: "Employer" },
];

export default function Signup() {
  const { data, setData, post, processing, errors } = useForm({
    // "Post a job" links arrive with ?role=employer preselected.
    role: new URLSearchParams(window.location.search).get("role") === "employer" ? "employer" : "jobseeker",
    firstName: "",
    middleName: "",
    surname: "",
    email: "",
    password: "",
    password_confirmation: "",
    acceptPrivacy: false,
  });

  const submit = (event) => {
    event.preventDefault();
    post("/register");
  };

  const isEmployer = data.role === "employer";
  const title = isEmployer ? "Create your Employer account" : "Create your Applicant account";
  const subtitle = isEmployer
    ? "Start posting roles and reviewing verified candidates."
    : "Join SkillBridge PH and start building your skill-based profile.";
  const nextStepHint = isEmployer
    ? "Next: set up your company details and verify your business."
    : "Next: build your profile — skills, education, and experience.";

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <Select
          id="signup-role"
          label="I'm signing up as"
          value={data.role}
          onChange={(event) => setData("role", event.target.value)}
          options={roleOptions}
          hint={nextStepHint}
          error={errors.role}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="signup-first-name"
            label="First name"
            placeholder="Andrea"
            value={data.firstName}
            onChange={(event) => setData("firstName", event.target.value)}
            error={errors.firstName}
          />
          <Input
            id="signup-surname"
            label="Surname"
            placeholder="Santos"
            value={data.surname}
            onChange={(event) => setData("surname", event.target.value)}
            error={errors.surname}
          />
        </div>
        <Input
          id="signup-middle-name"
          label="Middle name (optional)"
          placeholder="Lopez"
          value={data.middleName}
          onChange={(event) => setData("middleName", event.target.value)}
        />
        <Input
          id="signup-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={data.email}
          onChange={(event) => setData("email", event.target.value)}
          error={errors.email}
        />
        <Input
          id="signup-password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={data.password}
          onChange={(event) => setData("password", event.target.value)}
          error={errors.password}
        />
        <Input
          id="signup-confirm"
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          value={data.password_confirmation}
          onChange={(event) => setData("password_confirmation", event.target.value)}
        />
        <label className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={data.acceptPrivacy}
            onChange={(event) => setData("acceptPrivacy", event.target.checked)}
          />
          <span>
            I have read the{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-700 underline">Privacy Notice</a>{" "}
            and agree to SkillBridge PH processing my information to match me with {isEmployer ? "candidates" : "jobs"}.
          </span>
        </label>
        {errors.acceptPrivacy && <p role="alert" className="text-xs text-rose-600">Please accept the Privacy Notice to create an account.</p>}
        <Button type="submit" loading={processing} disabled={processing || !data.acceptPrivacy} className="mt-1 w-full">
          Create account
        </Button>
        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <a className="font-semibold text-sky-700 hover:text-sky-800" href="/login">
            Log in
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
