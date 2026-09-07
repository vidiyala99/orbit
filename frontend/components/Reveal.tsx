"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Fades + rises a section in once it scrolls into view (see `.reveal` /
 *  `.is-visible` in globals.css). Fires once, no replay on re-entry - a
 *  marketing page section re-animating every time someone scrolls past it
 *  reads as gimmicky, not alive. `delayMs` staggers siblings (feature cards,
 *  FAQ rows) without needing separate IntersectionObservers per child. */
export default function Reveal({
  children,
  delayMs = 0,
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  as?: "div" | "li" | "span";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
