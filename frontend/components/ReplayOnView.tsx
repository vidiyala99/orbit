"use client";
import { useEffect, useRef, useState } from "react";

/** Remounts its children (via a changing `key`) each time this element enters
 *  the viewport, so CSS keyframe animations and children like <Typewriter>
 *  replay whenever a visitor scrolls back to it — not a continuous loop, just
 *  re-triggered on re-entry. */
export default function ReplayOnView({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [playKey, setPlayKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPlayKey((k) => k + 1);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      <div key={playKey}>{children}</div>
    </div>
  );
}
