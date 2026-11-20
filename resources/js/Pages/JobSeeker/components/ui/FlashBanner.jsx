import { usePage } from "@inertiajs/react";

// Server success/error message for pages outside the main dashboard shell.
export default function FlashBanner() {
  const { props } = usePage();
  const text = props.flash?.error || props.flash?.success;
  if (!text) return null;
  const isError = Boolean(props.flash?.error);
  return (
    <div role={isError ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${isError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#F3D89B] bg-[#FFF3D6] text-neutral-900 font-semibold"}`}>
      {text}
    </div>
  );
}
