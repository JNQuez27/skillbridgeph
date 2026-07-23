import { useMemo, useState } from "react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";
import { useAuthState } from "./hooks/useAuth";
import { getSession, setSession } from "./hooks/useSession";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupContent() {
  const { signIn } = useAuthState();
  const { addToast } = useToast();
  const [role, setRole] = useState("jobseeker");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const roleCopy = {
    jobseeker: {
      title: "Create your Applicant account",
      subtitle: "Join SkillBridge PH and start building your skill-based profile.",
    },
    employer: {
      title: "Create your Employer account",
      subtitle: "Start posting roles and reviewing verified candidates.",
    },
  };

  const roleOptions = [
    { key: "jobseeker", label: "Applicant" },
    { key: "employer", label: "Employer" },
  ];

  const errors = useMemo(() => {
    return {
      firstName: firstName.trim().length === 0 ? "First name is required" : "",
      surname: surname.trim().length === 0 ? "Surname is required" : "",
      email: email.length > 0 && !emailRegex.test(email) ? "Enter a valid email" : "",
      password: password.length > 0 && password.length < 8 ? "Minimum 8 characters" : "",
      confirm: confirm.length > 0 && confirm !== password ? "Passwords do not match" : "",
    };
  }, [firstName, surname, email, password, confirm]);

  const isValid = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      surname.trim().length > 0 &&
      emailRegex.test(email) &&
      password.length >= 8 &&
      confirm === password
    );
  }, [firstName, surname, email, password, confirm]);

  const buildFullName = (first, middle, last) => {
    return [first, middle, last].map((value) => value.trim()).filter(Boolean).join(" ");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      const currentSession = getSession();
      const fullName = buildFullName(firstName, middleName, surname);
      setSession({
        ...currentSession,
        name: fullName,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        surname: surname.trim(),
        role,
        applicantProfileComplete: role === "jobseeker" ? false : true,
        employerNeedsValidation: role === "employer",
      });
      signIn();
      addToast({ message: "Account created. Welcome to SkillBridge PH!", type: "success" });
      if (role === "employer") {
        window.location.href = "/dashboard?role=employer&validate=employer";
      } else {
        window.location.href = "/onboarding";
      }
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
        <Input
          id="signup-first-name"
          label="First Name"
          placeholder="Andrea"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          error={errors.firstName}
        />
        <Input
          id="signup-middle-name"
          label="Middle Name (optional)"
          placeholder="Lopez"
          value={middleName}
          onChange={(event) => setMiddleName(event.target.value)}
        />
        <Input
          id="signup-surname"
          label="Surname"
          placeholder="Santos"
          value={surname}
          onChange={(event) => setSurname(event.target.value)}
          error={errors.surname}
        />
        <Input
          id="signup-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <Input
          id="signup-password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <Input
          id="signup-confirm"
          label="Confirm Password"
          type="password"
          placeholder="Repeat password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={errors.confirm}
        />
        <Button type="submit" loading={loading} disabled={!isValid} className="w-full">
          Create Account
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

export default function Signup() {
  return (
    <ToastProvider>
      <SignupContent />
    </ToastProvider>
  );
}
