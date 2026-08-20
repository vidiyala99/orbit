"use client";
import { useRouter } from "next/navigation";
import { clearClientToken } from "@/lib/auth";

export default function UserMenu() {
  const router = useRouter();

  function handleSignOut() {
    clearClientToken();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="btn-press font-mono text-xs text-rule">
      Sign out
    </button>
  );
}
