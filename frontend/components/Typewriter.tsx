"use client";
import { useEffect, useState } from "react";

/** Reveals `text` one character at a time. Remount (e.g. via ReplayOnView's
 *  changing key) to replay it. Shows the full text immediately under
 *  prefers-reduced-motion. */
export default function Typewriter({
  text, speedMs = 28, className, "data-testid": testId,
}: { text: string; speedMs?: number; className?: string; "data-testid"?: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const interval = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(interval);
          return n;
        }
        return n + 1;
      });
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  return (
    <span className={className} data-testid={testId}>
      {text.slice(0, shown)}
      {shown < text.length && <span aria-hidden="true" className="opacity-70">▍</span>}
    </span>
  );
}
