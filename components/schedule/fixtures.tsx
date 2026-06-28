import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import type { Event, EventStatus } from "@/lib/types";
import { weekdayKO } from "@/lib/schedule";

/* ------------------------------------------------------------------ *
 * Fixtures — the shared vocabulary for the club's schedule board. The
 * home magazine previews this season here and the full /schedule page
 * lists the whole calendar with the SAME row, so the two read as one
 * product. Latin numerals/labels use Space Grotesk so the dates land
 * like a live board; Korean copy stays on Pretendard.
 * ------------------------------------------------------------------ */

export const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: "예정",
  confirmed: "확정",
  running: "진행중",
  reg_closed: "레지마감",
  completed: "완료",
  canceled: "취소",
  hidden: "숨김",
};

// Registration-open / live states get the gold accent on the board.
export const ACTIVE_STATUS: ReadonlySet<EventStatus> = new Set<EventStatus>([
  "scheduled",
  "confirmed",
  "running",
]);

export function parseEventDate(date: string | null) {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: m[3] };
}

// Time is undecided when missing or explicitly set to "미정" — hide it.
export function eventTime(event: Event) {
  const t = event.start_time?.trim();
  return t && t !== "미정" ? t : null;
}

export function IconArrow({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14 M13 6l6 6-6 6" />
    </svg>
  );
}

// The tag is an EXCEPTION indicator, not a label on every row: "scheduled"
// (예정) is the baseline and just repeats the board/tab context, so it is
// suppressed. Only meaningful states speak — 확정 / 진행중 / 레지마감 / 완료 /
// 취소. `muted` forces the neutral tone regardless of status, used in the
// archive (result) view where a date-passed row must not read gold.
export function EventStatusTag({
  status,
  muted = false,
}: {
  status: EventStatus;
  muted?: boolean;
}) {
  if (status === "scheduled") return null;
  const active = !muted && ACTIVE_STATUS.has(status);
  return (
    <span
      className={`${display.className} inline-flex items-center gap-1.5 text-2xs font-medium ${
        active ? "text-gold" : "text-white/40"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-gold" : "bg-white/25"}`}
        aria-hidden="true"
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* --------------------------- fixture row ------------------------- *
 * One event as a board row: a left-aligned date stack (day is the hero,
 * gold start time tucked beneath), the title + place / buy-in, and the
 * status tag with a hover arrow. Archived rows dim as a set so the live
 * season always reads first.
 * ---------------------------------------------------------------- */
// `variant` controls the two faces of a fixture: "fixture" (예정) leads with
// full ink, a gold start time and a hover arrow — it reads as actionable.
// "result" (지난) is the archive face: monochrome, compressed, no gold, no
// arrow, no buy-in — a calm ledger that is unmistakably a different kind of
// thing at a glance.
export function FixtureRow({
  event,
  variant = "fixture",
}: {
  event: Event;
  variant?: "fixture" | "result";
}) {
  const result = variant === "result";
  const pd = parseEventDate(event.date);
  const time = eventTime(event);
  const meta = (result
    ? [event.location]
    : [event.location, event.buy_in]
  ).filter(Boolean) as string[];

  return (
    <li className="border-t border-white/[0.08] first:border-t-0">
      <Link
        href={`/schedule/${event.id}`}
        className={`group -mx-3 grid grid-cols-[4rem_1fr_auto] items-center gap-4 rounded-xl px-3 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:grid-cols-[5rem_1fr_auto] sm:gap-6 ${
          result ? "py-3.5" : "py-5 sm:py-6"
        }`}
      >
        {/* date & time — the day is the hero; the gold start time sits tight
            beneath it so the two tabular numerals read as one "when".
            Missing time just drops the line — no reserved slot. */}
        <div className={`${display.className} flex flex-col`}>
          <span
            className={`font-bold leading-none tracking-[-0.04em] tabular-nums ${
              result ? "text-lg text-white/70" : "text-2xl text-white sm:text-display-sm"
            }`}
          >
            {pd?.day ?? "—"}
          </span>
          {time && (
            <span
              className={`mt-1 font-semibold leading-none tabular-nums ${
                result ? "text-xs text-white/45" : "text-sm text-gold/90"
              }`}
            >
              {time}
            </span>
          )}
          <span
            className={`mt-1.5 text-2xs tracking-[0.02em] ${
              result ? "text-white/40" : "text-white/55"
            }`}
          >
            {pd ? `${pd.month}월${weekdayKO(event.date) ? ` · ${weekdayKO(event.date)}` : ""}` : event.date}
          </span>
        </div>

        {/* title + place / buy-in */}
        <div className="min-w-0">
          <h3
            className={`truncate text-base font-semibold tracking-[-0.01em] transition-colors sm:text-lg ${
              result ? "text-white/75" : "text-white group-hover:text-gold"
            }`}
          >
            {event.title}
          </h3>
          {meta.length > 0 && (
            <div
              className={`${display.className} mt-1.5 flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-0 ${
                result ? "text-white/40" : "text-white/55"
              }`}
            >
              {meta.map((m, i) => (
                <span key={i} className="inline-flex items-center">
                  {i > 0 && (
                    <span aria-hidden="true" className="mx-2 hidden text-white/25 sm:inline">·</span>
                  )}
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* status + arrow */}
        <div className="flex items-center gap-3 sm:gap-5">
          <EventStatusTag status={event.status} muted={result} />
          {!result && (
            <IconArrow
              size={16}
              className="hidden shrink-0 text-white/25 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:block"
            />
          )}
        </div>
      </Link>
    </li>
  );
}
