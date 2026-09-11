import { redirect } from "next/navigation";
import { APP_HOME } from "@/lib/routes";

/** Old location → theme → map funnel. One door: Slice A guests. */
export default function TryPage() {
  redirect(APP_HOME);
}
