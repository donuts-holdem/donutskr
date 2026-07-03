import { describe, it, expect } from "vitest";
import {
  TRASH_ENTITIES,
  TRASH_ENTITY_KEYS,
  isTrashEntity,
  type TrashEntity,
} from "@/lib/data/trash";
import { isAuthorizedCron } from "@/lib/cron";

describe("TRASH_ENTITIES mapping", () => {
  it("covers exactly the seven soft-delete entities", () => {
    expect(TRASH_ENTITY_KEYS.sort()).toEqual(
      [
        "blind_structures",
        "events",
        "navigation_tabs",
        "program_options",
        "programs",
        "seasons",
        "special_pages",
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
    expect(TRASH_ENTITIES.programs.labelColumn).toBe("title");
    expect(TRASH_ENTITIES.events.labelColumn).toBe("title");
    expect(TRASH_ENTITIES.special_pages.labelColumn).toBe("title");
    expect(TRASH_ENTITIES.seasons.labelColumn).toBe("name");
    expect(TRASH_ENTITIES.navigation_tabs.labelColumn).toBe("name");
    expect(TRASH_ENTITIES.blind_structures.labelColumn).toBe("name");
    expect(TRASH_ENTITIES.program_options.labelColumn).toBe("label");
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

describe("isAuthorizedCron", () => {
  it("accepts a matching Bearer token", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("rejects a mismatched or missing token", () => {
    expect(isAuthorizedCron("Bearer wrong", "s3cret")).toBe(false);
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });

  it("fails closed when the secret is unset", () => {
    expect(isAuthorizedCron("Bearer anything", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
  });
});
