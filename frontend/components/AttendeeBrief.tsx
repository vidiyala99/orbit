import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import type { AttendeeT, EventBriefT } from "@/lib/types";
import { AttendeeSocials, ChevronLeftIcon, PeopleIcon } from "./SocialIcons";

function initials(row: AttendeeT): string {
  return `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase();
}

function Avatar({ row }: { row: AttendeeT }) {
  const label = attendeeName(row);
  if (row.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatar_url}
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent"
    >
      {initials(row)}
    </span>
  );
}

export default function AttendeeBrief({
  event,
  attendees,
  backHref = "/",
}: {
  event: EventBriefT;
  attendees: AttendeeT[];
  backHref?: string;
}) {
  const count = attendees.length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground px-4 pb-10 pt-2">
      <header className="flex items-start gap-2 py-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="btn-press -ml-2 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
        >
          <ChevronLeftIcon />
        </Link>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.3px] text-ink">
            {event.title}
          </h1>
          <p className="mt-1 text-[12px] font-medium leading-snug text-ink2">{event.datetime}</p>
        </div>
        <p className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink2">
          <PeopleIcon />
          <span>
            {count} {count === 1 ? "guest" : "guests"}
          </span>
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {attendees.map((row) => {
          const name = attendeeName(row);
          return (
            <li key={row.id} className="relative rounded-card bg-surface shadow-card">
              <Link
                href={`/attendees/${row.id}`}
                className="absolute inset-0 rounded-card"
                aria-label={name}
              />
              <div className="flex items-start gap-3 px-4 py-3">
                <Avatar row={row} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <p className="text-[15px] font-bold leading-none text-ink">{name}</p>
                    <AttendeeSocials
                      name={name}
                      linkedinUrl={row.linkedin_url}
                      xUrl={row.x_url}
                      websiteUrl={row.website_url}
                    />
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink2">{row.role}</p>
                  <p className="mt-1 truncate font-mono text-[12px] italic leading-snug text-ink2">
                    {row.why_meet}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
