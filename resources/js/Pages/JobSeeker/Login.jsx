import { useEffect, useMemo, useState } from "react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";
import { getAuthState, useAuthState } from "./hooks/useAuth";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginContent() {
  const { signIn } = useAuthState();
  const { addToast } = useToast();
  const [role, setRole] = useState("jobseeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleCopy = {
    jobseeker: {
      title: "Applicant Login",
      subtitle: "Access your SkillBridge PH dashboard and keep your profile active.",
      helper: "Looking for work",
    },
    employer: {
      title: "Employer Login",
      subtitle: "Review applicants and manage openings for your company.",
      helper: "Hiring teams",
    },
  };

  const roleOptions = [
    {
      key: "jobseeker",
      label: "Applicant",
      description: "Fresh graduates and applicants",
    },
    {
      key: "employer",
      label: "Employer",
      description: "Companies hiring talent",
    },
  ];

  useEffect(() => {
    if (getAuthState()) {
      window.location.href = "/dashboard";
    }
  }, []);

  const isValid = useMemo(() => emailRegex.test(email) && password.length >= 8, [email, password]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (email !== "demo@skillbridge.ph" || password !== "password123") {
        setError("Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      signIn();
      addToast({ message: "Welcome back!", type: "success" });
      const nextRole = role === "employer" ? "employer" : "jobseeker";
      window.location.href = `/dashboard?role=${nextRole}`;
    }, 700);
  };

  return (
    <AuthLayout
      title={roleCopy[role].title}
      subtitle={roleCopy[role].subtitle}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-600">
            <span>Choose account type</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] text-emerald-700">
              {roleCopy[role].helper}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {roleOptions.map((option) => {
              const isActive = role === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setRole(option.key)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${isActive
                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40"
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}
        <Input
          id="login-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          rightSlot={
            <button
              type="button"
              className="text-xs font-semibold text-slate-500"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <a className="font-medium text-emerald-600 hover:text-emerald-700" href="/forgot-password">
            Forgot Password?
          </a>
          <span>Demo: demo@skillbridge.ph / password123</span>
        </div>
        <Button type="submit" loading={loading} disabled={!isValid} className="w-full">
          Log in
        </Button>
        <p className="text-center text-xs text-slate-500">
          Do not have an account?{" "}
          <a className="font-semibold text-emerald-600 hover:text-emerald-700" href="/signup">
            Sign up
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function Login() {
  return (
    <ToastProvider>
      <LoginContent />
    </ToastProvider>
  );
}
