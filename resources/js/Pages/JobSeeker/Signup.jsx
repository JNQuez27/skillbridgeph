import { useForm } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

const roleOptions = [
  { key: "jobseeker", label: "Applicant" },
  { key: "employer", label: "Employer" },
];

export default function Signup() {
  const { data, setData, post, processing, errors } = useForm({
    role: "jobseeker",
    firstName: "",
    middleName: "",
    surname: "",
    email: "",
    password: "",
    password_confirmation: "",
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

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-sky-50 p-1">
          {roleOptions.map((option) => {
            const isActive = data.role === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setData("role", option.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${isActive
                  ? "bg-white text-sky-800 shadow-sm"
                  : "text-slate-500 hover:text-sky-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
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
        <Button type="submit" loading={processing} disabled={processing} className="mt-1 w-full">
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
