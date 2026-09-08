import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Entities that soft-delete via `deleted_at` and are recoverable from the trash.
 * This is the single source of truth for the entity → table/label mapping; both
 * the trash page (this module) and the restore/purge actions read from it, so an
 * untrusted `entity` form value can never address a table outside this list.
 */
export type TrashEntity = "events" | "seasons" | "blind_structures";

interface TrashEntityConfig {
  /** DB table name (matches the key). */
  table: TrashEntity;
  /** Column holding the human-readable title. */
  labelColumn: string;
  /** Group heading shown in the admin trash UI. */
  title: string;
}

export const TRASH_ENTITIES: Record<TrashEntity, TrashEntityConfig> = {
  events: { table: "events", labelColumn: "title", title: "이벤트" },
  seasons: { table: "seasons", labelColumn: "name", title: "시즌" },
  blind_structures: { table: "blind_structures", labelColumn: "name", title: "블라인드 스트럭처" },
};

export const TRASH_ENTITY_KEYS = Object.keys(TRASH_ENTITIES) as TrashEntity[];

/** Server-side whitelist guard for the `entity` form value. */
export function isTrashEntity(value: unknown): value is TrashEntity {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TRASH_ENTITIES, value);
}

export interface TrashItem {
  entity: TrashEntity;
  id: string;
  label: string;
  deletedAt: string;
}

/**
 * All soft-deleted rows across every trash-eligible entity, normalized and
 * sorted newest-deleted first. Reads run with the admin's authenticated client;
 * the is_admin() RLS policy exposes deleted rows only to administrators.
 */
export async function getTrashedItems(): Promise<TrashItem[]> {
  const supabase = await createServerSupabase();
  const groups = await Promise.all(
    TRASH_ENTITY_KEYS.map(async (entity) => {
      const { table, labelColumn } = TRASH_ENTITIES[entity];
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        entity,
        id: String(row.id ?? ""),
        label: row[labelColumn] ? String(row[labelColumn]) : "(제목 없음)",
        deletedAt: String(row.deleted_at ?? ""),
      }));
    }),
  );
  return groups.flat().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}
