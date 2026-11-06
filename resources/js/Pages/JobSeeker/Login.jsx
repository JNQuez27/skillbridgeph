import { useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

export default function Login() {
  const { props } = usePage();
  const [showPassword, setShowPassword] = useState(false);
  const { data, setData, post, processing, errors } = useForm({
    email: "",
    password: "",
    remember: false,
  });

  const submit = (event) => {
    event.preventDefault();
    post("/login");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your SkillBridge PH account.">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {props.flash?.success && (
          <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{props.flash.success}</div>
        )}
        {errors.email && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{errors.email}</div>
        )}
        <Input
          id="login-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={data.email}
          onChange={(event) => setData("email", event.target.value)}
        />
        <Input
          id="login-password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Your password"
          value={data.password}
          onChange={(event) => setData("password", event.target.value)}
          rightSlot={
            <button
              type="button"
              className="h-11 px-2 text-xs font-semibold text-sky-700 hover:text-sky-800"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-500">
            <input
              type="checkbox"
              checked={data.remember}
              onChange={(event) => setData("remember", event.target.checked)}
            />
            Remember me
          </label>
          <a className="inline-block py-3 font-medium text-sky-700 hover:text-sky-800" href="/forgot-password">
            Forgot password?
          </a>
        </div>
        <Button type="submit" loading={processing} disabled={processing} className="w-full">
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
