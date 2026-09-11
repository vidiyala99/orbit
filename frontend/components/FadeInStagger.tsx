"use client";
import { Children, useEffect, useState } from "react";

/** Fades and slides up each direct child in sequence on mount, ~150ms apart.
 *  The only animated-on-load moment on the site (spec: Animation system, moment 1). */
export default function FadeInStagger({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {Children.map(children, (child, i) => (
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(10px)",
            transition: `opacity 400ms ease-out ${i * 150}ms, transform 400ms ease-out ${i * 150}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
}
