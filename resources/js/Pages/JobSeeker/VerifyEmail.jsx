import { router, useForm, usePage } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Button from "./components/ui/Button";

// Fig. 3, step 310: the account confirms its email before onboarding.
export default function VerifyEmail({ email }) {
  const { props } = usePage();
  const { post, processing } = useForm({});

  return (
    <AuthLayout title="Confirm your email" subtitle="One quick step before you build your profile.">
      <div className="flex flex-col gap-4">
        {props.flash?.success && (
          <div role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{props.flash.success}</div>
        )}
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-slate-700">
          We sent a confirmation link to <strong className="break-all text-sky-900">{email}</strong>.
        </div>
        <ol className="flex flex-col gap-2 text-sm text-slate-700">
          {["Open the email from SkillBridge PH.", "Click Verify Email Address. The link works for 60 minutes.", "You'll continue straight to your profile setup."].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" className="w-full" loading={processing} disabled={processing}
          onClick={() => post("/email/verification-notification", { preserveScroll: true })}>
          Resend confirmation email
        </Button>
        <p className="text-center text-xs text-slate-500">
          Wrong email address?{" "}
          <button type="button" className="inline-block py-3 font-semibold text-sky-700 hover:text-sky-800" onClick={() => router.post("/logout")}>
            Log out and sign up again
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
