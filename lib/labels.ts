// Central Korean labels for ADMIN enum fields — the single source admin forms
// and lists read so operators never see raw English enum values. The PUBLIC
// site keeps its own label maps (StatusBadge / program-display / LeagueStatusBlock);
// this module deliberately does not import or modify them, to avoid any public
// regression. Stored values stay the English keys; these are display only.
// Pure / client-safe — no server imports.
import type { EventStatus, ProgramGroup, SeasonCode, LeagueStatus } from "@/lib/types";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: "예정",
  confirmed: "확정",
  running: "진행중",
  reg_closed: "레지마감",
  completed: "완료",
  canceled: "취소",
  hidden: "숨김",
};
export const EVENT_STATUS_OPTIONS = (Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map(
  (value) => ({ value, label: EVENT_STATUS_LABELS[value] }),
);
export function eventStatusLabel(s: string): string {
  return EVENT_STATUS_LABELS[s as EventStatus] ?? s;
}

export const PROGRAM_GROUP_LABELS: Record<ProgramGroup, string> = {
  poker: "포커",
  social: "소셜",
  others: "기타",
};
export const PROGRAM_GROUP_OPTIONS = (Object.keys(PROGRAM_GROUP_LABELS) as ProgramGroup[]).map(
  (value) => ({ value, label: PROGRAM_GROUP_LABELS[value] }),
);
export function programGroupLabel(g: string): string {
  return PROGRAM_GROUP_LABELS[g as ProgramGroup] ?? g;
}

export const SEASON_CODE_LABELS: Record<SeasonCode, string> = {
  spring: "봄",
  summer: "여름",
  autumn: "가을",
  winter: "겨울",
};
// Options keep the English code in parentheses (matches the existing SeasonForm UX).
export const SEASON_CODE_OPTIONS = (Object.keys(SEASON_CODE_LABELS) as SeasonCode[]).map(
  (value) => ({ value, label: `${SEASON_CODE_LABELS[value]} (${value})` }),
);
export function seasonCodeLabel(c: string): string {
  return SEASON_CODE_LABELS[c as SeasonCode] ?? c;
}

export const TAB_TYPE_OPTIONS: { value: "internal" | "external" | "special"; label: string }[] = [
  { value: "internal", label: "내부 링크" },
  { value: "external", label: "외부 링크" },
  { value: "special", label: "특수 페이지" },
];

export const LEAGUE_STATUS_OPTIONS: { value: LeagueStatus; label: string }[] = [
  { value: "operating", label: "운영 중" },
  { value: "revamping", label: "개편 중" },
  { value: "preparing", label: "준비 중" },
  { value: "suspended", label: "일시 중단" },
  { value: "hidden", label: "숨김" },
];

// Program status: the column is free text with legacy Korean values
// ("모집 중"×19, "모집 완료"×1, ""×3 in real data). The form becomes a Select on
// standard keys; normalizeProgramStatus maps legacy values so the right option
// preselects and a save migrates that row lazily (no bulk DB write).
export const PROGRAM_STATUS_OPTIONS = [
  { value: "recruiting", label: "모집중" },
  { value: "ongoing", label: "진행중" },
  { value: "closed", label: "마감" },
  { value: "completed", label: "종료" },
] as const;

const PROGRAM_STATUS_NORMALIZE: Record<string, string> = {
  recruiting: "recruiting", "모집중": "recruiting", "모집 중": "recruiting",
  ongoing: "ongoing", "진행중": "ongoing", "진행 중": "ongoing",
  closed: "closed", "마감": "closed", "모집완료": "closed", "모집 완료": "closed",
  completed: "completed", "종료": "completed", "완료": "completed",
};
export function normalizeProgramStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  return PROGRAM_STATUS_NORMALIZE[raw.trim()] ?? "";
}
