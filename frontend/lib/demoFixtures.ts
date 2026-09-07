import { compose_dm_payload, compose_note_payload } from "./contactCopy";
import type { AttendeePriorityT, AttendeeT, EventBriefT } from "./types";

export const DEMO_OFFLINE_TOKEN = "orbit-demo-offline";

/** Slice A demo event — dense desk header is title + short when. */
export const FIXTURE_EVENT: EventBriefT = {
  id: "nerdconf-sf",
  title: "NERDCONF SF",
  datetime: "Sat",
};

function attendee(
  id: string,
  first: string,
  last: string,
  role: string,
  why: string,
  priority: AttendeePriorityT,
  note: AttendeeT["note"],
  extra: Partial<
    Pick<
      AttendeeT,
      | "website_url"
      | "avatar_url"
      | "linkedin_connected"
      | "x_interacted"
      | "note_payload"
      | "dm_payload"
      | "evidence"
    >
  > = {},
): AttendeeT {
  const handle = `${first}-${last}`.toLowerCase().replace(/[^a-z-]/g, "");
  const source = { first_name: first, note };
  return {
    id,
    first_name: first,
    last_name: last,
    role,
    linkedin_url: `https://www.linkedin.com/in/${handle}`,
    x_url: `https://x.com/${handle.replace("-", "")}`,
    website_url: extra.website_url ?? null,
    why_meet: why,
    avatar_url: extra.avatar_url ?? null,
    priority,
    linkedin_connected: extra.linkedin_connected ?? false,
    x_interacted: extra.x_interacted ?? false,
    note,
    note_payload: extra.note_payload ?? compose_note_payload(source),
    dm_payload: extra.dm_payload ?? compose_dm_payload(source),
    evidence: extra.evidence ?? [],
  };
}

export const FIXTURE_ATTENDEES: AttendeeT[] = [
  attendee(
    "alex-chen",
    "Alex",
    "Chen",
    "Founder, Render",
    "Building agent infra — overlap with your Render work",
    "needs_you",
    {
      where_met: "NERDCONF SF · hallway track",
      what_talked: "Agent infra and how teams ship evals without a second platform.",
      why: "Building the layer your last two projects already assume exists.",
    },
    {
      website_url: "https://render.com",
      linkedin_connected: true,
      x_interacted: true,
      evidence: [
        {
          source_id: "linkup:render-blog",
          quote: "Render's engineering blog, Aug 2026: shipping a first-class agent runtime on top of the existing web-service primitives.",
        },
        {
          source_id: "linkup:x-thread",
          quote: "Posted on X: \"the eval loop is the actual product, the model call is a rounding error\" — 40 replies from infra people.",
        },
      ],
    },
  ),
  attendee(
    "marcus-ellis",
    "Marcus",
    "Ellis",
    "Founding Engineer at Render",
    "Shipping the runtime your agent stack would sit on",
    "needs_you",
    {
      where_met: "Burning Token hackathon · Austin",
      what_talked: "The future of agentic tools and how Render is thinking about infra for them.",
      why: "He's building in the same problem space and could be a great collaborator or advisor.",
    },
    {
      x_interacted: true,
      evidence: [
        {
          source_id: "linkup:render-careers",
          quote: "Render careers page lists an open req for \"Founding Engineer, Agent Runtime\" posted this week.",
        },
      ],
    },
  ),
  attendee(
    "priya-raman",
    "Priya",
    "Raman",
    "ML Engineer, Lattice",
    "Hiring an ML engineer; you just shipped a ranking stack",
    "needs_you",
    {
      where_met: "Founders Cowork Wednesdays · Red Rock Coffee",
      what_talked: "Eval harnesses for search ranking and who to hire first.",
      why: "Same hiring problem, complementary stack.",
    },
    {
      linkedin_connected: true,
      evidence: [
        {
          source_id: "linkup:lattice-jobs",
          quote: "Lattice's job board: \"ML Engineer, Ranking\" — Priya is listed as the hiring manager.",
        },
      ],
    },
  ),
  attendee(
    "jules-okada",
    "Jules",
    "Okada",
    "Independent designer",
    "Just shipped a spatial OS — wants a technical pair",
    "needs_you",
    {
      where_met: "NERDCONF SF · design lounge",
      what_talked: "How spatial UIs survive a 200-person room.",
      why: "Needs an engineer who has shipped event-scale surfaces.",
    },
    {
      website_url: "https://okada.work",
      x_interacted: true,
      evidence: [
        {
          source_id: "linkup:okada-work",
          quote: "Portfolio site: shipped \"Atlas\", a spatial OS prototype for 200+ concurrent users, launched last month.",
        },
      ],
    },
  ),
  attendee(
    "amina-shah",
    "Amina",
    "Shah",
    "Recruiter, Anthropic",
    "Placing applied-research ICs this month",
    "needs_you",
    {
      where_met: "NERDCONF SF · talent table",
      what_talked: "Who in the room is actually shipping vs. pitching.",
      why: "Can intro the applied-research ICs you asked about.",
    },
    {
      linkedin_connected: true,
      evidence: [
        {
          source_id: "linkup:anthropic-careers",
          quote: "Anthropic careers page: 6 open applied-research roles posted in the last 30 days.",
        },
      ],
    },
  ),
  attendee(
    "maya-rao",
    "Maya",
    "Rao",
    "PM, Notion",
    "Owning the post-event workspace nobody opens",
    "needs_you",
    {
      where_met: "Peninsula Regulars · Castro",
      what_talked: "Turning a guest list into a living notes doc.",
      why: "Has the distribution; you have the contact note.",
    },
    {
      linkedin_connected: true,
      x_interacted: true,
      evidence: [
        {
          source_id: "linkup:notion-blog",
          quote: "Notion product blog: Maya shipped \"Notion for events\" workspace templates, referenced in the launch post.",
        },
      ],
    },
  ),
  attendee(
    "dev-kim",
    "Dev",
    "Kim",
    "Seed investor",
    "Writing checks for event-infra this quarter",
    "high",
    {
      where_met: "NERDCONF SF · investor office hours",
      what_talked: "Follow-up after the room dies — the actual retention hole.",
      why: "Looking at the category you're building in.",
    },
    { linkedin_connected: true },
  ),
  attendee(
    "sam-ortiz",
    "Sam",
    "Ortiz",
    "Founder, Relays",
    "Same pain: follow-up after the room dies",
    "high",
    {
      where_met: "Burning Token hackathon · Austin",
      what_talked: "What people actually copy-paste the next morning.",
      why: "Building the adjacent product; worth a weekly sync.",
    },
    { x_interacted: true },
  ),
  attendee(
    "sophie-carter",
    "Sophie",
    "Carter",
    "Senior Brand Strategist at Horizon Creative",
    "Rewriting how event brands stay after the weekend",
    "high",
    {
      where_met: "NERDCONF SF · brand workshop",
      what_talked: "Why most event follow-up reads like a newsletter.",
      why: "Can tighten the note you send the next morning.",
    },
    { linkedin_connected: true },
  ),
  attendee(
    "kenji-watanabe",
    "Kenji",
    "Watanabe",
    "Infra, Cloudflare",
    "Edge runtime for live attendee graphs",
    "high",
    {
      where_met: "NERDCONF SF · infra birds of a feather",
      what_talked: "Keeping a 2k-person list snappy on a bad venue network.",
      why: "Would review the list path you're about to ship.",
    },
    { x_interacted: true },
  ),
  attendee(
    "riley-cole",
    "Riley",
    "Cole",
    "Founder, Cork",
    "Same cork/cream brief — already in five cities",
    "later",
    {
      where_met: "Founders Cowork Wednesdays · Red Rock Coffee",
      what_talked: "Warm paper UI that still reads as a product, not a mood board.",
      why: "Has operators in rooms you want next.",
    },
    { website_url: "https://cork.events", linkedin_connected: true },
  ),
  attendee(
    "theo-brooks",
    "Theo",
    "Brooks",
    "Engineer, Vercel",
    "Shipped the last three conference companion apps",
    "later",
    {
      where_met: "NERDCONF SF · hallway track",
      what_talked: "What actually gets opened the morning after.",
      why: "Knows the failure modes of guest-list products.",
    },
  ),
];

export function fixtureAttendee(id: string): AttendeeT | undefined {
  return FIXTURE_ATTENDEES.find((row) => row.id === id);
}

export function attendeeName(row: Pick<AttendeeT, "first_name" | "last_name">): string {
  return `${row.first_name} ${row.last_name}`;
}
