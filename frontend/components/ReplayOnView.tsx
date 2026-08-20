"use client";
import { useEffect, useRef, useState } from "react";

/** Calls `children(play)` with `play` false until this element first enters
 *  the viewport, then true — and re-renders with a fresh key each time it
 *  re-enters, so consumers using CSS `animation` (which starts counting from
 *  mount, not from any JS event) only ever start animating once actually
 *  visible, and replay on every re-entry rather than firing once at page
 *  load regardless of scroll position. */
export default function ReplayOnView({
  children,
}: {
  children: (play: boolean) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [playKey, setPlayKey] = useState(0);
  const hasEntered = playKey > 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Small elements can be entirely contained within the viewport the
    // instant they merely touch its edge — a ratio-based threshold alone
    // doesn't help there. Shrinking the root by a fixed pixel margin
    // (computed from the real viewport height) guarantees a genuine
    // reading-zone buffer regardless of target size.
    const margin = Math.round(window.innerHeight * 0.25);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPlayKey((k) => k + 1);
      },
      { threshold: 0, rootMargin: `-${margin}px 0px -${margin}px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {hasEntered && <div key={playKey}>{children(true)}</div>}
    </div>
  );
}
