import { Head } from "@inertiajs/react";

// Plain-language notice under the Data Privacy Act of 2012 (RA 10173). Every
// statement here describes what the system actually does today.
const sections = [
  {
    title: "What we collect",
    items: [
      "Account details: your name, email address, and password (stored only as a one-way hash).",
      "Applicant profile: headline, location, experience level, desired roles, education, experience, and skills.",
      "Files you upload: CV, certificates, portfolio files, and hands-on demo videos, plus details read from them (file fingerprint, file metadata, and skills mentioned in the text).",
      "Assessment attempts: score, pass or fail, and time taken.",
      "Employer details: company information, recruiter contact, DTI/SEC registration number, and business permit.",
    ],
  },
  {
    title: "Why we use it",
    items: [
      "To match applicants with jobs, and jobs with applicants, based on skills, location, and experience.",
      "To verify skills and credentials, so employers can trust what a profile says.",
      "To detect fraud, for example the same document uploaded by two different accounts.",
    ],
  },
  {
    title: "Who can see it",
    items: [
      "Your uploaded files are private. An employer can open them only after you apply to one of its roles or accept its invitation.",
      "Employers see your profile, your skills, and how each skill was verified when you appear in their candidate list.",
      "SkillBridge PH admins can see submitted registrations, permits, and certificates in order to check them.",
      "We do not sell your information.",
    ],
  },
  {
    title: "Checks with government registries",
    items: [
      "If you ask us to check a TESDA certificate, an admin searches TESDA's public Registry of Certified Workers using the name on your account and your certificate number.",
      "If you ask us to check a PRC license, an admin searches the PRC verification site with your name and license number.",
      "Companies are checked against the DTI or SEC registry using the registration number they submit.",
      "These checks happen only when you ask for them, and we record when you gave that consent.",
    ],
  },
  {
    title: "Your rights",
    items: [
      "Under RA 10173 you may ask to access, correct, or delete your personal data, or withdraw your consent.",
      "You can edit your profile and remove uploaded files yourself at any time, except a file that is the evidence for a verified badge.",
      "For anything else, contact the SkillBridge PH team. Account deletion is handled on request.",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-sky-50 px-4 py-10 font-sans text-slate-800">
      <Head title="Privacy Notice" />
      <main className="mx-auto max-w-3xl space-y-6">
        <a href="/" className="inline-block py-3 text-sm font-semibold text-sky-700">← SkillBridge PH</a>
        <header>
          <h1 className="text-3xl font-semibold text-sky-900">Privacy Notice</h1>
          <p className="mt-2 text-sm text-slate-600">
            How SkillBridge PH collects and uses personal information, under the Data Privacy Act of 2012 (Republic Act No. 10173).
          </p>
        </header>
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-sky-900">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
