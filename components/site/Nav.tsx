import Link from "next/link";
import { getVisibleTabs } from "@/lib/data/tabs";

const INTERNAL_PATH: Record<string, string> = {
  schedule: "/schedule",
  "online-league": "/online-league",
  leaderboard: "/leaderboard",
};

export async function Nav() {
  const today = new Date().toISOString().slice(0, 10);
  const tabs = await getVisibleTabs(today);
  return (
    <nav className="flex items-center gap-4 text-sm">
      {tabs.map((t) => {
        const href =
          t.type === "external"
            ? (t.external_url ?? "#")
            : t.type === "special"
              ? `/${t.slug}`
              : (INTERNAL_PATH[t.key] ?? `/${t.key}`);
        const ext = t.type === "external";
        return (
          <Link
            key={t.id}
            href={href}
            target={ext ? "_blank" : undefined}
            rel={ext ? "noopener noreferrer" : undefined}
            className={`text-ink/70 hover:text-gold transition-colors${t.mobile_visible ? "" : " hidden sm:inline"}`}
          >
            {t.name}
          </Link>
        );
      })}
    </nav>
  );
}
