/** ActintroMark — two overlapping seats: match → commit. */
export default function BrandMark({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" fill="currentColor" />
    </svg>
  );
}
