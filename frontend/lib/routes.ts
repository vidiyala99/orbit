/** After sign-in: the Home dashboard (Upcoming / Needs follow-up / Past events). */
export const APP_HOME = "/home";

export function afterAuthPath(user: { onboarded_at?: string | null }): string {
  return user.onboarded_at ? APP_HOME : "/onboarding";
}

/** On unless explicitly set to "false". */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== "false";
}
