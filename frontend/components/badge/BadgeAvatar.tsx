"use client";

import { useState } from "react";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Guest photo from live data. Initials sit underneath, so a slow or huge photo never
 * leaves a blank tile, and a broken URL falls back to them.
 */
export default function BadgeAvatar({
  src,
  name,
  className = "",
  eager = false,
}: {
  src: string | null;
  name: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`bw-avatar ${className}`}
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : name}
    >
      <span aria-hidden="true" className="bw-avatar-fallback">
        {initialsOf(name)}
      </span>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Luma/LinkedIn URLs, images.unoptimized
        <img
          src={src!}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="bw-avatar-img"
        />
      ) : null}
    </span>
  );
}
