import { useForm } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";

export default function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors } = useForm({
    token,
    email: email || "",
    password: "",
    password_confirmation: "",
  });

  const submit = (event) => {
    event.preventDefault();
    post("/reset-password");
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="The link in your email works once and expires after 60 minutes.">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Input
          id="reset-email"
          label="Email"
          type="email"
          value={data.email}
          onChange={(event) => setData("email", event.target.value)}
          error={errors.email}
        />
        <Input
          id="reset-password"
          label="New password"
          type="password"
          placeholder="At least 8 characters"
          value={data.password}
          onChange={(event) => setData("password", event.target.value)}
          error={errors.password}
        />
        <Input
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          value={data.password_confirmation}
          onChange={(event) => setData("password_confirmation", event.target.value)}
        />
        <Button type="submit" className="w-full" loading={processing} disabled={processing}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
