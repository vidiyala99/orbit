import Home from "@/components/Home";
import { loadHomeData } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadHomeData();
  return <Home data={data} />;
}
