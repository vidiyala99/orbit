/** After Try it out: category chips, then the map shortlist. */
export const APP_HOME = "/explore";

export function afterAuthPath(user: { onboarded_at?: string | null }): string {
  return user.onboarded_at ? APP_HOME : "/onboarding";
}

/** Hackathon default: on unless explicitly set to "false". */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "false";
}
