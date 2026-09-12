import { NextResponse } from "next/server";

/** Marketing waitlist. Forwards to Formspree (or any form endpoint) when
 *  WAITLIST_FORM_ENDPOINT is set. Without it (local), accepts and no-ops so
 *  the UI can be exercised offline. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const endpoint = process.env.WAITLIST_FORM_ENDPOINT?.trim();
  if (!endpoint) {
    // Dev / marketing preview without Formspree configured.
    console.info("[waitlist] accepted (no WAITLIST_FORM_ENDPOINT):", email);
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[waitlist] upstream failed", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: "Could not join the waitlist right now." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    console.error("[waitlist] upstream error", err);
    return NextResponse.json(
      { error: "Could not join the waitlist right now." },
      { status: 502 },
    );
  }
}
