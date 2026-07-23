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
    },
    employer: {
      title: "Employer Login",
      subtitle: "Review applicants and manage openings for your company.",
    },
  };

  const roleOptions = [
    { key: "jobseeker", label: "Applicant" },
    { key: "employer", label: "Employer" },
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-sky-50 p-1">
          {roleOptions.map((option) => {
            const isActive = role === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setRole(option.key)}
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
              className="text-xs font-semibold text-sky-700 hover:text-sky-800"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
        <div className="flex justify-end text-xs">
          <a className="font-medium text-sky-700 hover:text-sky-800" href="/forgot-password">
            Forgot password?
          </a>
        </div>
        <Button type="submit" loading={loading} disabled={!isValid} className="w-full">
          Log in
        </Button>
        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <a className="font-semibold text-sky-700 hover:text-sky-800" href="/signup">
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
