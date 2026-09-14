"use client";

import { useEffect, useRef, useState } from "react";

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
 * leaves a blank tile, and a broken URL falls back to them. The photo is visible by
 * default; only one still loading when the page hydrates is held back and resolves
 * from a soft blur once it arrives.
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
  const [phase, setPhase] = useState<"idle" | "loading" | "loaded">("idle");
  const imgRef = useRef<HTMLImageElement>(null);
  const showImage = Boolean(src) && !failed;

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    setPhase(img.complete && img.naturalWidth > 0 ? "idle" : "loading");
  }, [src]);

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
          ref={imgRef}
          src={src!}
          alt={name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setPhase((p) => (p === "loading" ? "loaded" : p))}
          onError={() => setFailed(true)}
          className={`bw-avatar-img ${phase === "loading" ? "is-loading" : ""} ${phase === "loaded" ? "is-loaded" : ""}`}
        />
      ) : null}
    </span>
  );
}
