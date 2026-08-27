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
    <button
      onClick={handleSignOut}
      className="btn-press rounded-full px-2 py-1 text-[11.5px] font-medium text-ink3 transition-colors hover:bg-accent-soft hover:text-ink"
    >
      Sign out
    </button>
  );
}
