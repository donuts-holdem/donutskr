// Idempotent, null-only backfill of events.season_id by date window.
// Assignment rule mirrors lib/season-rules.ts assignSeasonByDate (source of truth).
// Usage: node scripts/backfill-event-seasons.mjs           (dry-run)
//        node scripts/backfill-event-seasons.mjs --apply    (write)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const dateKey = (d) => (DATE_PREFIX.exec(d ?? "")?.[1] ?? null);
function assignSeasonByDate(date, seasons) {
  const d = dateKey(date);
  if (!d) return null;
  const matches = seasons.filter(
    (s) => s.start_date != null && s.end_date != null && d >= s.start_date && d <= s.end_date
  );
  return matches.length === 1 ? matches[0].id : null;
}

const apply = process.argv.includes("--apply");
const { data: seasons, error: seasonsError } = await sb
  .from("seasons").select("id,name,start_date,end_date").is("deleted_at", null);
if (seasonsError) { console.error("failed to read seasons:", seasonsError); process.exit(1); }
const { data: events, error: eventsError } = await sb
  .from("events").select("id,title,date,season_id").is("deleted_at", null).is("season_id", null);
if (eventsError) { console.error("failed to read events:", eventsError); process.exit(1); }

console.log(`seasons: ${seasons.length}, null-season events: ${events.length}`);
const plan = [];
for (const e of events) {
  const sid = assignSeasonByDate(e.date, seasons);
  if (sid) plan.push({ id: e.id, title: e.title, date: e.date, season_id: sid });
}
console.log(`would assign: ${plan.length} (the remaining ${events.length - plan.length} stay null/evergreen)`);
for (const p of plan) console.log(`  ${p.date} | ${p.title} -> ${p.season_id}`);

if (!apply) { console.log("\nDRY-RUN. Re-run with --apply to write."); process.exit(0); }
for (const p of plan) {
  const { error } = await sb.from("events").update({ season_id: p.season_id }).eq("id", p.id);
  if (error) { console.error("update failed", p.id, error); process.exit(1); }
}
console.log(`applied ${plan.length} updates.`);
