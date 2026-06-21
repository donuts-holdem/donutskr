// Shared display helpers for program-related UI (used by ProgramCard, program
// detail page, PartnerList). Keep pure/client-safe — no server imports.

const PROGRAM_STATUS_LABELS: Record<string, string> = {
  recruiting: "모집중",
  ongoing: "진행중",
  closed: "마감",
  completed: "종료",
};

export function programStatusLabel(status: string | null): string {
  if (!status) return "";
  return PROGRAM_STATUS_LABELS[status] ?? status;
}

// Treats absolute http(s)/protocol-relative/mailto/tel as external; everything
// else (including leading-slash app paths) as internal. Single source of truth
// so ProgramCard / detail CTA / PartnerList / ExternalNotice agree.
export function isExternalUrl(url: string): boolean {
  return /^(https?:|mailto:|tel:|\/\/)/i.test(url);
}

// Resolve a link target into { href, isExternal } for rendering as <a> vs <Link>.
export function resolveHref(url: string): { href: string; isExternal: boolean } {
  return { href: url, isExternal: isExternalUrl(url) };
}

// Format an ISO date string ("2026-06-20T..." or "2026-06-20") as "2026.06.20".
export function formatDotDate(dateString: string): string {
  return dateString.slice(0, 10).replace(/-/g, ".");
}
