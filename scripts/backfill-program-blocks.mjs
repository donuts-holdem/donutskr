/**
 * Idempotent null-only backfill of programs.description_blocks.
 *
 * Run ONCE in Supabase SQL editor before executing this script:
 *
 *   alter table programs add column if not exists description_blocks jsonb;
 *   alter table programs add column if not exists description_verified boolean not null default false;
 *
 * Usage:
 *   node scripts/backfill-program-blocks.mjs            (dry-run, default)
 *   node scripts/backfill-program-blocks.mjs --apply    (write description_blocks)
 *
 * Safety guarantees:
 *   - Reads only rows WHERE description_blocks IS NULL AND description_verified = false.
 *   - Never overwrites a non-null description_blocks.
 *   - Never sets description_verified (stays false; humans verify in admin).
 *   - Never touches description.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { htmlToBlocks } from "./lib/program-blocks-convert.mjs";

// ---------------------------------------------------------------------------
// Load .env.local (same pattern as backfill-event-seasons.mjs)
// ---------------------------------------------------------------------------
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

if (!env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const apply = process.argv.includes("--apply");

// ---------------------------------------------------------------------------
// Read null-only, unverified programs
// ---------------------------------------------------------------------------
const { data: programs, error: readError } = await sb
  .from("programs")
  .select("id, slug, description")
  .is("description_blocks", null)
  .is("description_verified", false);

if (readError) {
  console.error("failed to read programs:", readError);
  process.exit(1);
}

console.log(`programs with null description_blocks (unverified): ${programs.length}`);

// ---------------------------------------------------------------------------
// Convert each program
// ---------------------------------------------------------------------------
const plan = [];
for (const p of programs) {
  const { blocks, usedRaw } = htmlToBlocks(p.description ?? "");
  plan.push({ id: p.id, slug: p.slug, blocks, usedRaw });
}

// ---------------------------------------------------------------------------
// Dry-run report
// ---------------------------------------------------------------------------
const rawFallbacks = plan.filter((p) => p.usedRaw);

if (rawFallbacks.length > 0) {
  console.log(`\nNEEDS HUMAN ATTENTION (raw fallback — ${rawFallbacks.length}):`);
  for (const p of rawFallbacks) console.log(`  ${p.slug}`);
} else {
  console.log("all programs converted cleanly (0 raw fallbacks)");
}

const clean = plan.filter((p) => !p.usedRaw);
console.log(`\nsummary: ${clean.length} clean, ${rawFallbacks.length} raw-fallback`);

if (!apply) {
  console.log("\nDRY-RUN. Re-run with --apply to write description_blocks.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Apply — write description_blocks (never sets description_verified)
// ---------------------------------------------------------------------------
for (const p of plan) {
  const { error } = await sb
    .from("programs")
    .update({ description_blocks: p.blocks })
    .eq("id", p.id);
  if (error) {
    console.error("update failed", p.slug, error);
    process.exit(1);
  }
}
console.log(`\napplied ${plan.length} updates (description_verified unchanged).`);
