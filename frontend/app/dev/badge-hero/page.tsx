import { notFound } from "next/navigation";
import BadgeHome from "@/components/badge/BadgeHome";
import type { BadgePerson } from "@/lib/badge";

/**
 * Dev-only fixture for Playwright interaction tests and multi-viewport screenshots.
 * Every person here is synthetic.
 */

const OTHERS: [string, string, string, string][] = [
  ["Dev", "Patel", "Staff Engineer", "Lattice Guard"],
  ["Lena", "Voss", "Security Researcher", "Brightline"],
  ["Maximiliana", "Brightwater", "Co-founder and CTO", "Visor Labs"],
  ["Priya", "Shah", "Head of Platform", "Quillbase"],
  ["Alex", "Morgan", "ML Engineer", "Northwind Labs"],
  ["Samir", "Khalid", "Partner", "Keel Ventures"],
  ["Tess", "Lin", "Product Lead", "Ironmark"],
  ["Noah", "Kim", "Engineering Manager", "Fieldstone"],
  ["Elena", "Garcia", "Recruiter", "Harbor AI"],
];

function synthetic(id: string, first: string, last: string, title: string, company: string): BadgePerson {
  return {
    id,
    firstName: first,
    lastName: last,
    title,
    company,
    avatarUrl: null,
    linkedinUrl: "https://www.linkedin.com/",
    xUrl: null,
    priority: "high",
    signals: [],
    approach: "Ask what they're building and the hardest technical constraint.",
    why: "Works on problems close to your Focus.",
    recent: null,
    about: null,
    companyBullets: [],
  };
}

const MAYA: BadgePerson = {
  id: "fixture-maya",
  firstName: "Maya",
  lastName: "Okafor",
  title: "Head of Security Engineering",
  company: "Northwind Labs",
  // Synthetic test photo cut from the approved comp; real Home uses each guest's avatar_url.
  avatarUrl: "/badge/fixture-guest-photo.png",
  linkedinUrl: "https://www.linkedin.com/in/maya-okafor-fixture/",
  xUrl: "https://x.com/maya_fixture",
  priority: "needs_you",
  signals: ["Potentially hiring"],
  approach: "Three security roles are open. Ask which one owns agent runtime security.",
  why: "Hiring security engineers. Fits your Focus: backend engineer moving into AI security.",
  recent: "Posted this week about red-teaming voice agents before launch.",
  about: "Leads security engineering for agent runtimes. Previously built detection systems at two cloud companies.",
  companyBullets: [
    "Builds runtime security for AI agents",
    "Series A, team of about 40",
    "Careers page lists 3 security roles",
  ],
};

const PEOPLE: BadgePerson[] = [
  synthetic("fixture-1", "Ravi", "Menon", "Security Engineer", "Cloudway"),
  synthetic("fixture-2", "Grace", "Hughes", "Designer", "Pinepost"),
  MAYA,
  ...OTHERS.map(([first, last, title, company], i) => synthetic(`fixture-${i + 4}`, first, last, title, company)),
];

export default function BadgeHeroFixture() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <BadgeHome
      event={{ id: "fixture-event", title: "AI Security Hackathon", startsAt: null }}
      eventTimeLabel="Sat 10:00"
      people={PEOPLE}
      initialIndex={2}
      initialDecisions={{ "fixture-1": "kept", "fixture-2": "skipped" }}
    />
  );
}
