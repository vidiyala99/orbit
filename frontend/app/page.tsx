import DemoEnterButton from "@/components/DemoEnterButton";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ground px-6">
      <h1 className="text-4xl font-extrabold tracking-[-0.6px] text-ink sm:text-5xl">Orbit</h1>
      <p className="mt-3 max-w-xs text-center text-sm font-medium text-ink2 sm:text-base">
        Meet people around what you&apos;re into.
      </p>
      <div className="mt-8">
        <DemoEnterButton label="Try it out" next="/try" />
      </div>
    </main>
  );
}
