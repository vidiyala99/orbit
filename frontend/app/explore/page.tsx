"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getClientToken } from "@/lib/auth";
import SectionNav from "@/components/SectionNav";

export default function ExplorePage() {
  const router = useRouter();

  useEffect(() => {
    if (!getClientToken()) router.replace("/sign-in");
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-ground px-[18px] pb-28 pt-8 md:max-w-lg md:pb-10 md:pt-20">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">Orbit</p>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.35px] text-ink">
        What are you into?
      </h1>
      <p className="mt-2 text-[14px] font-medium leading-relaxed text-ink2">
        One tap. We&apos;ll shortlist what&apos;s happening nearby.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-2.5">
        {CATEGORIES.map((category) => (
          <li key={category.key}>
            <Link
              href={`/map?category=${category.key}`}
              className="lift btn-press flex h-[72px] items-center justify-center rounded-card bg-surface text-[16px] font-bold text-ink shadow-card hover:shadow-card-hover"
            >
              {category.label}
            </Link>
          </li>
        ))}
      </ul>
      <SectionNav />
    </main>
  );
}
