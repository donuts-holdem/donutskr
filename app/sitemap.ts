import type { MetadataRoute } from "next";
import { getEvents } from "@/lib/legacy/data/events";

const BASE = "https://do-nuts.kr";
const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${BASE}/schedule`, priority: 1 },
  { url: `${BASE}/series`, priority: 0.9 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const events = await getEvents();
    return [
      ...staticRoutes,
      ...events.map((event) => ({
        url: `${BASE}/schedule/${event.id}`,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
