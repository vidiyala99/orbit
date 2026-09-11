"use client";

/** The only account entry point in the app — a small trigger next to the
 *  OrbitMark in AppNav (see AppNav.tsx), reachable from every signed-in
 *  route. Deliberately minimal per CLAUDE.md: email + Sign out, not a
 *  settings page. Opens upward since it lives in the bottom tab bar. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { fetchMe } from "@/lib/api";
import { clearClientToken, ensureClientToken } from "@/lib/auth";

const MENU_SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

export default function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    let cancelled = false;
    ensureClientToken()
      .then((token) => (token ? fetchMe(token) : null))
      .then((user) => {
        if (!cancelled && user) setEmail(user.email);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    clearClientToken();
    setOpen(false);
    router.push("/");
  }

  const initial = email ? email.trim().charAt(0).toUpperCase() : "?";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="btn-press flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-fl-xs font-bold text-accent transition-colors hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.97 }}
            transition={reduceMotion ? { duration: 0 } : MENU_SPRING}
            className="absolute bottom-full right-0 mb-2 w-56 origin-bottom-right rounded-card border border-rule bg-surface p-1.5 shadow-card"
          >
            <p className="truncate px-2.5 py-2 text-fl-xs font-semibold text-ink3">
              {email ?? "Signed in"}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="btn-press w-full rounded-lg px-2.5 py-2 text-left text-fl-sm font-bold text-ink transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Sign out
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
