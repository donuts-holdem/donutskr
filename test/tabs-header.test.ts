import { describe, it, expect } from "vitest";
import { resolveTabHref, selectHeaderTabs } from "@/lib/data/tabs";
import type { NavTab } from "@/lib/types";

function makeTab(overrides: Partial<NavTab>): NavTab {
  return {
    id: "t", name: "탭", key: "k", type: "internal", slug: null, external_url: null,
    is_visible: true, sort_order: 0, mobile_visible: true,
    start_show_date: null, end_show_date: null,
    home_card_visible: false, home_card_title: null, home_card_desc: null, home_card_cta: null,
    ...overrides,
  };
}

describe("resolveTabHref", () => {
  const cases: { name: string; tab: Partial<NavTab>; expected: string | null }[] = [
    { name: "internal keeps a leading-slash route", tab: { type: "internal", slug: "/programs" }, expected: "/programs" },
    { name: "internal adds the missing leading slash", tab: { type: "internal", slug: "programs" }, expected: "/programs" },
    { name: "internal without a slug is unusable", tab: { type: "internal", slug: null }, expected: null },
    { name: "internal with a blank slug is unusable", tab: { type: "internal", slug: "  " }, expected: null },
    { name: "external returns its url", tab: { type: "external", external_url: "https://x.com/a" }, expected: "https://x.com/a" },
    { name: "external without a url is unusable", tab: { type: "external", external_url: null }, expected: null },
    { name: "special maps a bare slug to /slug", tab: { type: "special", slug: "challenge" }, expected: "/challenge" },
    { name: "special strips a leading slash", tab: { type: "special", slug: "/challenge" }, expected: "/challenge" },
    { name: "special without a slug is unusable", tab: { type: "special", slug: null }, expected: null },
  ];
  for (const c of cases) {
    it(c.name, () => {
      expect(resolveTabHref(makeTab(c.tab))).toBe(c.expected);
    });
  }
});

describe("selectHeaderTabs (special cross-check + href resolution)", () => {
  const publicSlugs = new Set(["challenge"]);

  const cases: {
    name: string;
    tab: Partial<NavTab>;
    included: boolean;
    href?: string;
    external?: boolean;
    mobileHidden?: boolean;
  }[] = [
    { name: "internal tab is always included", tab: { name: "프로그램", type: "internal", slug: "/programs" }, included: true, href: "/programs", external: false, mobileHidden: false },
    { name: "external tab is included and flagged external", tab: { name: "블로그", type: "external", external_url: "https://x.com" }, included: true, href: "https://x.com", external: true, mobileHidden: false },
    { name: "special tab backed by a public page is included", tab: { name: "챌린지", type: "special", slug: "challenge" }, included: true, href: "/challenge", external: false, mobileHidden: false },
    { name: "special tab with no public page is dropped", tab: { name: "유령", type: "special", slug: "ghost" }, included: false },
    { name: "internal tab without a destination is dropped", tab: { type: "internal", slug: null }, included: false },
    { name: "mobile_visible=false surfaces as mobileHidden", tab: { name: "일정", type: "internal", slug: "/schedule", mobile_visible: false }, included: true, href: "/schedule", external: false, mobileHidden: true },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const result = selectHeaderTabs([makeTab(c.tab)], publicSlugs);
      if (!c.included) {
        expect(result).toHaveLength(0);
        return;
      }
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        label: c.tab.name,
        href: c.href,
        external: c.external,
        mobileHidden: c.mobileHidden,
      });
    });
  }

  it("preserves input order and filters a mixed list in one pass", () => {
    const tabs = [
      makeTab({ name: "프로그램", type: "internal", slug: "/programs" }),
      makeTab({ name: "유령", type: "special", slug: "ghost" }),
      makeTab({ name: "챌린지", type: "special", slug: "challenge" }),
    ];
    expect(selectHeaderTabs(tabs, publicSlugs).map((t) => t.label)).toEqual(["프로그램", "챌린지"]);
  });
});
