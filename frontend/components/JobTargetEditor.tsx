"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateJobTarget } from "@/lib/api";
import { getClientToken } from "@/lib/auth";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Could not save job target";
}

/** Low-ceremony inline editor for the user's job search target — the input
 *  that drives shortlist re-ranking. Closed state is a single summary line;
 *  editing swaps it for two plain inputs, no modal. */
export default function JobTargetEditor({
  targetRole,
  targetIndustries,
}: {
  targetRole: string | null;
  targetIndustries: string[] | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(targetRole ?? "");
  const [industries, setIndustries] = useState((targetIndustries ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const token = getClientToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await updateJobTarget(
        {
          target_role: role.trim() || null,
          target_industries: industries.trim()
            ? industries.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
        },
        token,
      );
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const summary = targetRole
      ? `${targetRole}${targetIndustries?.length ? ` in ${targetIndustries.join(", ")}` : ""}`
      : null;
    return (
      <div className="flex flex-wrap items-baseline gap-2 text-fl-sm text-ink2">
        <span>
          {summary ? (
            <>
              Looking for: <strong className="font-bold text-ink">{summary}</strong>
            </>
          ) : (
            "Set your job target to sharpen your shortlist"
          )}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-fl-xs font-bold text-accent hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-wrap items-center gap-2 rounded-card border border-rule bg-surface px-3 py-2 shadow-card"
    >
      <label className="sr-only" htmlFor="target_role">
        Target role
      </label>
      <input
        id="target_role"
        type="text"
        placeholder="Target role (e.g. Senior PM)"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="field w-44 rounded-field border border-rule bg-surface px-2.5 py-1.5 text-fl-sm text-ink placeholder:text-ink3"
      />
      <label className="sr-only" htmlFor="target_industries">
        Target industries
      </label>
      <input
        id="target_industries"
        type="text"
        placeholder="Industries, comma separated"
        value={industries}
        onChange={(e) => setIndustries(e.target.value)}
        className="field w-56 rounded-field border border-rule bg-surface px-2.5 py-1.5 text-fl-sm text-ink placeholder:text-ink3"
      />
      <button
        type="submit"
        disabled={saving}
        className="btn-press rounded-full bg-ink px-3 py-1.5 text-fl-xs font-bold text-ground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-fl-xs font-semibold text-ink3 hover:text-ink"
      >
        Cancel
      </button>
      {error ? (
        <p role="alert" className="w-full text-fl-xs font-semibold text-accent">
          {error}
        </p>
      ) : null}
    </form>
  );
}
