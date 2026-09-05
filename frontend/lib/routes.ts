/** Signed-in home. Map is the primary surface — not the Wall. */
export const APP_HOME = "/map";

export function afterAuthPath(user: { onboarded_at?: string | null }): string {
  return user.onboarded_at ? APP_HOME : "/onboarding";
}

/** Hackathon default: on unless explicitly set to "false". */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "false";
}
