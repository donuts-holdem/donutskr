/**
 * Parity guard: proves the ESM mirror in scripts/lib/program-blocks-convert.mjs
 * is byte-equivalent to the TS source lib/program-blocks-convert.ts over all
 * 23 real fixtures. If this test fails, the mirror has drifted — fix the mirror,
 * not this test.
 */
import { describe, it, expect } from "vitest";
import { htmlToBlocks as tsHtmlToBlocks } from "@/lib/program-blocks-convert";
import { htmlToBlocks as mjsHtmlToBlocks } from "../scripts/lib/program-blocks-convert.mjs";
import fixtures from "./fixtures/program-descriptions.json";

describe("backfill converter parity — scripts/lib mirror vs lib/program-blocks-convert (TS)", () => {
  it.each(fixtures as { slug: string; description: string }[])(
    "mirror output matches TS converter for $slug",
    ({ description }) => {
      const tsResult = tsHtmlToBlocks(description);
      const mjsResult = (mjsHtmlToBlocks as typeof tsHtmlToBlocks)(description);
      expect(JSON.stringify(mjsResult)).toBe(JSON.stringify(tsResult));
    }
  );
});
