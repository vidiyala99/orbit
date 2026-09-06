/** Slice A social glyphs — ink2/accent, never browser-blue brand fills. */

const ICON = "h-4 w-4 shrink-0";

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
      <path
        fill="var(--ground)"
        d="M4.6 6.3h1.6v5.3H4.6V6.3Zm.8-2.6c.52 0 .94.42.94.95S5.92 5.6 5.4 5.6s-.95-.42-.95-.95.43-.95.95-.95ZM7.4 6.3h1.54v.73h.02c.22-.4.74-.82 1.53-.82 1.64 0 1.94 1.08 1.94 2.48v2.91h-1.6V9.02c0-.86-.02-1.96-1.2-1.96-1.2 0-1.38.93-1.38 1.9v2.64H7.4V6.3Z"
      />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 2.4h2.6l2.5 3.4 2.1-3.4h2.4L9.8 7.4 13 13.6H10.3L7.6 9.8l-2.3 3.8H2.9l3.2-5.2L3.2 2.4Zm1.6.9 6.6 9.4h1.1L5.8 3.3H4.8Z"
      />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <circle cx="6" cy="5" r="2.1" fill="currentColor" />
      <path
        fill="currentColor"
        d="M2.4 12.2c0-2 1.8-3.4 3.6-3.4s3.6 1.4 3.6 3.4v.4H2.4v-.4Z"
      />
      <circle cx="11.2" cy="5.4" r="1.7" fill="currentColor" />
      <path
        fill="currentColor"
        d="M9.4 12.2c.3-1.6 1.6-2.8 3.1-2.8.5 0 1 .1 1.4.4v3.2H9.4Z"
      />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.2 3.2 5.4 8l4.8 4.8"
      />
    </svg>
  );
}

const SOCIAL =
  "relative z-10 inline-flex h-8 w-8 items-center justify-center text-ink2 hover:text-accent";
const SOCIAL_DENSE =
  "relative z-10 inline-flex h-6 w-6 items-center justify-center text-ink2 hover:text-accent";

export function AttendeeSocials({
  name,
  linkedinUrl,
  xUrl,
  dense = false,
}: {
  name: string;
  linkedinUrl: string;
  xUrl: string;
  dense?: boolean;
}) {
  const cls = dense ? SOCIAL_DENSE : SOCIAL;
  return (
    <span className="inline-flex shrink-0 items-center">
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} on LinkedIn`}
        className={cls}
      >
        <LinkedInIcon />
      </a>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} on X`}
        className={cls}
      >
        <XIcon />
      </a>
    </span>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.2 9.05 6.2 14.2 8 9.05 9.8 8 14.8 6.95 9.8 1.8 8l5.15-1.8L8 1.2Z"
      />
    </svg>
  );
}
