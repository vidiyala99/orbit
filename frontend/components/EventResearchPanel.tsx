"use client";
import { useState } from "react";
import { researchEvent } from "@/lib/api";
import { ResearchT } from "@/lib/types";

export default function EventResearchPanel({
  token,
  planId,
  query,
}: {
  token: string;
  planId?: string;
  query?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchT | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setResult(await researchEvent({ query, planId }, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      data-testid="event-research"
      className="rounded-card bg-surface p-4 shadow-card"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-accent">
        Linkup research
      </p>
      <h2 className="mt-1 text-[16px] font-extrabold tracking-[-0.2px] text-ink">
        Research this event
      </h2>
      <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink2">
        Who&apos;s relevant, what the room is about, and how to open. One tap.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="lift btn-press mt-3 w-full rounded-full bg-accent py-2.5 text-[13px] font-bold text-ground shadow-raised hover:shadow-raised-hover disabled:opacity-60"
      >
        {loading ? "Researching…" : result ? "Run again" : "Run deep research"}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-ink">
            {result.answer}
          </p>
          {result.sources.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {result.sources.map((source) => (
                <li key={`${source.url}-${source.title}`} className="text-[11px]">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-accent underline decoration-accent/40"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="font-medium text-ink2">{source.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.04em] text-ink3">
            {result.provider === "linkup" ? "Live via Linkup" : "Offline brief"}
          </p>
        </div>
      )}
    </section>
  );
}
