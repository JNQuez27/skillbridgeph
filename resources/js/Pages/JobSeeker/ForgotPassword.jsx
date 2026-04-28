import { useMemo, useState } from "react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValid = useMemo(() => emailRegex.test(email), [email]);

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we will send a reset link."
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
        <Input
          id="forgot-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          type="button"
          className="w-full"
          disabled={!isValid}
          onClick={() => setSubmitted(true)}
        >
          Send reset link
        </Button>
        {submitted && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Reset link sent.
          </div>
        )}
        <p className="text-center text-xs text-slate-500">
          Remembered your password?{" "}
          <a className="font-semibold text-emerald-600 hover:text-emerald-700" href="/login">
            Back to login
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
