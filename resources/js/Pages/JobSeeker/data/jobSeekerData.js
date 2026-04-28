export const skillOptions = [
  "Customer Service",
  "Barista",
  "Cash Handling",
  "Inventory",
  "Graphic Design",
  "Social Media",
  "Virtual Assistance",
  "Scheduling",
  "Email Management",
  "Bookkeeping",
  "Retail Sales",
  "Food Prep",
  "Event Coordination",
  "Copywriting",
  "Sales Support",
  "Project Coordination",
  "Content Creation",
  "Data Entry",
  "Logistics",
  "Client Support",
];

export const suggestedJobs = [
  {
    id: 1,
    title: "Cafe Barista",
    company: "Sunrise Coffee Co.",
    location: "Makati City",
    type: "Full-time",
    match: 92,
    tags: ["Food and Beverage", "Frontline"],
  },
  {
    id: 2,
    title: "Graphic Designer",
    company: "Luna Creative Studio",
    location: "Remote",
    type: "Contract",
    match: 88,
    tags: ["Design", "Branding"],
  },
  {
    id: 3,
    title: "Virtual Assistant",
    company: "TaskBridge Partners",
    location: "Remote",
    type: "Full-time",
    match: 85,
    tags: ["Admin", "Client Support"],
  },
  {
    id: 4,
    title: "Retail Sales Associate",
    company: "Harbor Mart",
    location: "Taguig City",
    type: "Full-time",
    match: 80,
    tags: ["Sales", "Customer Service"],
  },
];

export const recentActivity = [
  { id: 1, text: "Profile updated with 2 new skills", time: "2 hours ago" },
  { id: 2, text: "Saved Cafe Barista role", time: "1 day ago" },
  { id: 3, text: "Completed onboarding step 4", time: "2 days ago" },
];

export const defaultProfile = {
  name: "Andrea Santos",
  role: "Marketing Assistant",
  location: "Quezon City, Philippines",
  bio: "Goal-driven applicant focused on customer service and creative support roles.",
  applicantProfileComplete: true,
  applicantProfile: {
    name: "Andrea Santos",
    location: "Quezon City, Philippines",
    contact: "andrea.santos@email.com",
    skills: ["Customer Service", "Social Media", "Scheduling", "Content Creation"],
    experience: {
      title: "Sales Associate",
      company: "BrightMart",
      description: "Assisted customers, managed inventory, and closed daily sales reports.",
      level: "Entry",
    },
    education: {
      school: "Polytechnic University of the Philippines",
      degree: "BS in Business Administration",
      year: "2025",
    },
    portfolio: [
      "https://behance.net/andrea-santos",
      "https://linkedin.com/in/andrea-santos",
    ],
    completedAssessments: ["Customer Service Essentials"],
    verifiedBadges: ["Client Champion", "Content Builder"],
  },
  skills: [
    { name: "Customer Service", verified: true },
    { name: "Social Media", verified: false },
    { name: "Scheduling", verified: true },
    { name: "Content Creation", verified: false },
  ],
  education: {
    school: "Polytechnic University of the Philippines",
    degree: "BS in Business Administration",
    year: "2025",
  },
  experience: [
    {
      title: "Sales Associate",
      company: "BrightMart",
      description: "Assisted customers, managed inventory, and closed daily sales reports.",
    },
  ],
  portfolio: [
    "https://behance.net/andrea-santos",
    "https://linkedin.com/in/andrea-santos",
  ],
  completeness: 78,
};
