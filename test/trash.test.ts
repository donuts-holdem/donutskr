import { describe, it, expect } from "vitest";
import {
  TRASH_ENTITIES,
  TRASH_ENTITY_KEYS,
  isTrashEntity,
  type TrashEntity,
} from "@/lib/legacy/data/trash";

describe("TRASH_ENTITIES mapping", () => {
  it("covers only the retained schedule entities", () => {
    expect(TRASH_ENTITY_KEYS.sort()).toEqual(
      [
        "blind_structures",
        "events",
        "seasons",
      ].sort(),
    );
  });

  it("keys match their own table name (no cross-table aliasing)", () => {
    for (const key of TRASH_ENTITY_KEYS) {
      expect(TRASH_ENTITIES[key].table).toBe(key);
    }
  });

  it("gives every entity a non-empty label column and title", () => {
    for (const key of TRASH_ENTITY_KEYS) {
      expect(TRASH_ENTITIES[key].labelColumn.length).toBeGreaterThan(0);
      expect(TRASH_ENTITIES[key].title.length).toBeGreaterThan(0);
    }
  });

  it("maps entities to the correct human-readable title columns", () => {
    expect(TRASH_ENTITIES.events.labelColumn).toBe("title");
    expect(TRASH_ENTITIES.seasons.labelColumn).toBe("name");
    expect(TRASH_ENTITIES.blind_structures.labelColumn).toBe("name");
  });
});

describe("isTrashEntity whitelist guard", () => {
  it("accepts every known entity", () => {
    for (const key of TRASH_ENTITY_KEYS) {
      expect(isTrashEntity(key)).toBe(true);
    }
  });

  it("rejects arbitrary / injected table names and non-strings", () => {
    const rejected: unknown[] = [
      "users",
      "site_config",
      "programs; drop table programs",
      "",
      "PROGRAMS",
      null,
      undefined,
      42,
      { table: "programs" },
    ];
    for (const value of rejected) {
      expect(isTrashEntity(value)).toBe(false);
    }
  });

  it("narrows the type so the value indexes TRASH_ENTITIES", () => {
    const value: unknown = "seasons";
    if (isTrashEntity(value)) {
      const entity: TrashEntity = value;
      expect(TRASH_ENTITIES[entity].table).toBe("seasons");
    } else {
      throw new Error("expected 'seasons' to be a trash entity");
    }
  });
});
