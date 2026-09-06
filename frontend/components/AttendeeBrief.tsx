import Link from "next/link";
import { attendeeName } from "@/lib/demoFixtures";
import type { AttendeeT, EventBriefT } from "@/lib/types";
import { AttendeeSocials, ChevronLeftIcon, PeopleIcon } from "./SocialIcons";

function initials(row: AttendeeT): string {
  return `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase();
}

function Avatar({ row }: { row: AttendeeT }) {
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
    <main className="mx-auto min-h-screen w-full max-w-md bg-ground px-6 pb-16 pt-4">
      <header className="pb-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={backHref}
            aria-label="Back"
            className="btn-press -ml-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink"
          >
            <ChevronLeftIcon />
          </Link>
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink3">
            <PeopleIcon />
            <span>
              {count} {count === 1 ? "guest" : "guests"}
            </span>
          </p>
        </div>
        <h1 className="mt-4 text-[22px] font-extrabold leading-tight tracking-[-0.3px] text-ink">
          {event.title}
        </h1>
        <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink3">{event.datetime}</p>
      </header>

      <ul className="flex flex-col gap-4">
        {attendees.map((row) => {
          const name = attendeeName(row);
          return (
            <li
              key={row.id}
              className="relative rounded-card bg-surface shadow-card transition-shadow duration-150 hover:shadow-card-hover"
            >
              <Link
                href={`/attendees/${row.id}`}
                className="absolute inset-0 rounded-card"
                aria-label={name}
              />
              <div className="flex items-start gap-4 px-4 py-4">
                <Avatar row={row} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 truncate text-[16px] font-bold leading-none text-ink">
                      {name}
                    </p>
                    <AttendeeSocials
                      name={name}
                      linkedinUrl={row.linkedin_url}
                      xUrl={row.x_url}
                      websiteUrl={row.website_url}
                    />
                  </div>
                  <p className="mt-2 truncate text-[13px] font-medium leading-snug text-ink2">
                    {row.role}
                  </p>
                  <p
                    title={row.note.why}
                    className="mt-2 truncate font-mono text-[12px] italic leading-snug text-ink2"
                  >
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
