export const CATEGORIES = [
  { key: "tech", label: "Tech" },
  { key: "design", label: "Design" },
  { key: "food", label: "Food" },
  { key: "music", label: "Music" },
  { key: "sports", label: "Sports" },
  { key: "outdoors", label: "Outdoors" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function categoryLabel(key: string | undefined): string | null {
  return CATEGORIES.find((c) => c.key === key)?.label ?? null;
}
