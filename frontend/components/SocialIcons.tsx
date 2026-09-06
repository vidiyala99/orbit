/** Slice A social glyphs — ink2/accent, never browser-blue brand fills. */

const ICON = "h-4 w-4 shrink-0";

export function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
      <path
        fill="#F5F3EE"
        d="M4.2 6.2h1.7v5.6H4.2V6.2Zm.85-2.8c.55 0 1 .45 1 .99s-.45.99-1 .99-.99-.45-.99-.99.44-.99.99-.99ZM7.3 6.2h1.62v.76h.02c.23-.43.8-.88 1.64-.88 1.76 0 2.08 1.16 2.08 2.66v3.06h-1.7V9.1c0-.82-.02-1.88-1.14-1.88-1.15 0-1.32.9-1.32 1.82v2.76H7.3V6.2Z"
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
  showLinkedIn = false,
  showX = false,
  dense = false,
}: {
  name: string;
  linkedinUrl: string;
  xUrl: string;
  showLinkedIn?: boolean;
  showX?: boolean;
  dense?: boolean;
}) {
  if (!showLinkedIn && !showX) return null;
  const cls = dense ? SOCIAL_DENSE : SOCIAL;
  return (
    <span className="inline-flex shrink-0 items-center">
      {showLinkedIn ? (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on LinkedIn`}
          className={cls}
        >
          <LinkedInIcon />
        </a>
      ) : null}
      {showX ? (
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on X`}
          className={cls}
        >
          <XIcon />
        </a>
      ) : null}
    </span>
  );
}

