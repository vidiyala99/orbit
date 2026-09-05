"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchNearbyCandidates, startThread, togglePresenceOff, togglePresenceOn } from "@/lib/api";
import { MatchCandidateT } from "@/lib/types";

function errorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    // GeolocationPositionError isn't constructible in jsdom, so tests stub it
    // as a plain object with a `code` field rather than `instanceof`-checking it.
    return "Location access is needed to see who's nearby.";
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export default function EventRoomView({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidateT[]>([]);
  const [sayingHiTo, setSayingHiTo] = useState<string | null>(null);

  async function turnOn() {
    setLoading(true);
    setError(null);
    try {
      // Fail closed on missing/denied location — never fall back to a stored
      // or last-known position, which could surface people who aren't
      // actually nearby (see the design spec's Error handling).
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      await togglePresenceOn(position.coords.latitude, position.coords.longitude, token);
      const nearby = await fetchNearbyCandidates(token);
      setCandidates(nearby);
      setOpen(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function turnOff() {
    setLoading(true);
    try {
      await togglePresenceOff(token);
    } catch {
      // Toggling off is best-effort — the row expires on its own either way.
    } finally {
      setOpen(false);
      setCandidates([]);
      setLoading(false);
    }
  }

  async function sayHi(candidate: MatchCandidateT) {
    setSayingHiTo(candidate.user_id);
    try {
      const thread = await startThread(candidate.user_id, token);
      router.push(`/chats/${thread.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSayingHiTo(null);
    }
  }

  return (
    <div className="px-[18px] py-3.5">
      <button
        type="button"
        onClick={open ? turnOff : turnOn}
        disabled={loading}
        className={`lift btn-press block w-full rounded-full py-3 text-center text-[13.5px] font-bold shadow-raised hover:shadow-raised-hover disabled:opacity-60 ${
          open ? "bg-surface text-ink" : "bg-ink text-ground"
        }`}
      >
        {loading ? "…" : open ? "You're open to meeting people — Stop" : "I'm here, open to meeting people"}
      </button>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      {open && (
        <div className="mt-3.5">
          {candidates.length === 0 ? (
            <div className="rounded-card bg-surface p-4 text-center shadow-card">
              <p className="text-[13px] font-medium text-ink2">No one else nearby right now.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {candidates.map((c) => (
                <li key={c.user_id} className="lift rounded-card bg-surface p-4 shadow-card hover:shadow-card-hover">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-ink">
                      {c.first_name ?? "Someone"} {c.last_name ?? ""}
                    </span>
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
                      {Math.round(c.match_score * 100)}% match
                    </span>
                  </div>
                  {c.why_meet && (
                    <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-ink2">
                      {c.why_meet}
                    </p>
                  )}
                  {c.intent_tags && c.intent_tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.intent_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-accent"
                        >
                          {tag.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-[11px] flex items-center justify-between border-t border-rule pt-2.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent">
                      <span className="live-dot" aria-hidden="true" />
                      HERE NOW
                    </span>
                    <button
                      type="button"
                      onClick={() => sayHi(c)}
                      disabled={sayingHiTo === c.user_id}
                      className="btn-press rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-ground disabled:opacity-60"
                    >
                      {sayingHiTo === c.user_id ? "…" : "Say hi"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
