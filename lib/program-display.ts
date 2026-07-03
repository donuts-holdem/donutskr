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

// Resolve a status value to its display label. DB-managed option labels
// (program_options status) take priority — an admin adding value=waitlist /
// label=대기중 must show 대기중 on public cards, not the raw slug — with the
// static map above as the fallback for legacy/removed values. Mirrors the
// groupLabels prop pattern used across ProgramCard/ProgramBoard/HomeMagazine.
export function resolveProgramStatusLabel(
  status: string | null,
  statusLabels?: Record<string, string>,
): string {
  if (!status) return "";
  return statusLabels?.[status] ?? programStatusLabel(status);
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

// A program's run as "2026.06.20 – 2026.07.04" when an end date exists, else the
// start alone. Single source so every card/detail agrees on the range format.
export function formatDateRange(start: string, end: string | null): string {
  return end ? `${formatDotDate(start)} – ${formatDotDate(end)}` : formatDotDate(start);
}

// A program card always links to its internal detail route; the detail page's
// CTA is what opens any external link. Single source so every card variant agrees.
export function programHref(program: { slug: string }): string {
  return `/programs/${program.slug}`;
}

// Category groups for the /programs directory filter. `key` matches
// Program.program_group ("all" = no filter).
export const PROGRAM_CATEGORIES = [
  { key: "all", label: "전체", labelEn: "ALL" },
  { key: "poker", label: "포커", labelEn: "POKER" },
  { key: "social", label: "소셜", labelEn: "SOCIAL" },
  { key: "others", label: "기타", labelEn: "OTHERS" },
] as const;

// Whether a status counts as "open" (recruiting/ongoing) vs closed/completed —
// drives the status badge tone so open programs read as actionable. A custom
// admin status (e.g. "waitlist") that isn't explicitly closed/완료 defaults to
// open/gold — a defensible default so new statuses read as actionable, not dead.
export function isOpenStatus(status: string | null): boolean {
  if (!status) return false;
  return !/(closed|completed|마감|종료|완료)/i.test(status);
}
