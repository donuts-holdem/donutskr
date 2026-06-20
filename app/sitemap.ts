import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/data/events";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { getPrograms } from "@/lib/data/programs";

const BASE = "https://do-nuts.kr";

// Static routes always included
const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE, priority: 1 },
  { url: `${BASE}/programs`, priority: 0.8 },
  { url: `${BASE}/poker`, priority: 0.5 },
  { url: `${BASE}/social`, priority: 0.5 },
  { url: `${BASE}/others`, priority: 0.4 },
  { url: `${BASE}/series`, priority: 0.9 },
  { url: `${BASE}/schedule`, priority: 0.8 },
  { url: `${BASE}/online-league`, priority: 0.6 },
  { url: `${BASE}/leaderboard`, priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dynamic slug entries are included only when a build-time/cookies-free read
  // client is available (i.e. Supabase is provisioned and cookies() does not
  // throw in this request-less sitemap context). When Supabase is not yet
  // provisioned or cookies() is unavailable, we fall back to static routes only
  // so the build never fails.
  try {
    const [events, specials, programs] = await Promise.all([
      getEvents(),
      getAllSpecialPages(),
      getPrograms(),
    ]);
    return [
      ...staticRoutes,
      ...programs.map((p) => ({ url: `${BASE}/programs/${p.slug}`, priority: 0.6 as const })),
      ...events.map((e) => ({ url: `${BASE}/schedule/${e.id}`, priority: 0.6 as const })),
      ...specials.map((s) => ({ url: `${BASE}/${s.slug}`, priority: 0.6 as const })),
    ];
  } catch {
    // Supabase not provisioned or cookies() unavailable in sitemap context —
    // return static routes only to ensure the build succeeds.
    return staticRoutes;
  }
}
