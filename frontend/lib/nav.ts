/** The four signed-in sections, shared by the desktop top nav and the mobile
 *  tab bar so the two can never drift apart.
 *
 *  `icon` is a geometric glyph rather than an icon set — the app has no icon
 *  dependency and the shapes double as the map/legend vocabulary. */
export const SECTIONS = [
  { href: "/today", label: "Wall", icon: "●" },
  { href: "/map", label: "Map", icon: "◆" },
  { href: "/rooms", label: "Rooms", icon: "▣" },
  { href: "/chats", label: "Chats", icon: "✉" },
];

export function isActiveSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
