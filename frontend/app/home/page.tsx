import BadgeHome from "@/components/badge/BadgeHome";
import { toBadgePerson } from "@/lib/badge";
import { loadHomeData } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadHomeData();
  const featured = data.featuredEvent
    ? (data.events.find((e) => e.id === data.featuredEvent!.id) ?? null)
    : null;

  return (
    <BadgeHome
      event={featured ? { id: featured.id, title: featured.title, startsAt: featured.starts_at } : null}
      people={data.reviewQueue.map(toBadgePerson)}
      persistTriage
    />
  );
}
