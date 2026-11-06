import { useForm, usePage } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

export default function ForgotPassword() {
  const { props } = usePage();
  const { data, setData, post, processing, errors } = useForm({ email: "" });

  const submit = (event) => {
    event.preventDefault();
    post("/forgot-password", { preserveScroll: true });
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we will send a reset link."
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        {props.flash?.success && (
          <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{props.flash.success}</div>
        )}
        <Input
          id="forgot-email"
          label="Email"
          type="email"
          placeholder="you@email.com"
          value={data.email}
          onChange={(event) => setData("email", event.target.value)}
          error={errors.email}
        />
        <Button type="submit" className="w-full" loading={processing} disabled={processing || !data.email}>
          Send reset link
        </Button>
        <p className="text-center text-xs text-slate-500">
          Remembered your password?{" "}
          <a className="font-semibold text-sky-700 hover:text-sky-800" href="/login">
            Back to login
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
