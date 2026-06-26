import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import type { Event, EventStatus } from "@/lib/types";

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

// Completed / canceled fixtures are the archive — rendered, but dimmed.
export const ARCHIVED_STATUS: ReadonlySet<EventStatus> = new Set<EventStatus>([
  "completed",
  "canceled",
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

export function EventStatusTag({ status }: { status: EventStatus }) {
  const active = ACTIVE_STATUS.has(status);
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
export function FixtureRow({ event }: { event: Event }) {
  const pd = parseEventDate(event.date);
  const time = eventTime(event);
  const meta = [event.location, event.buy_in].filter(Boolean) as string[];
  const archived = ARCHIVED_STATUS.has(event.status);

  return (
    <li className="border-t border-white/[0.08] first:border-t-0">
      <Link
        href={`/schedule/${event.id}`}
        className={`group -mx-3 grid grid-cols-[4rem_1fr_auto] items-center gap-4 rounded-xl px-3 py-5 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:grid-cols-[5rem_1fr_auto] sm:gap-6 sm:py-6 ${
          archived ? "opacity-60 hover:opacity-90" : ""
        }`}
      >
        {/* date & time — the day is the hero; the gold start time sits tight
            beneath it so the two tabular numerals read as one "when".
            Missing time just drops the line — no reserved slot. */}
        <div className={`${display.className} flex flex-col`}>
          <span className="text-2xl font-bold leading-none tracking-[-0.04em] text-white tabular-nums sm:text-display-sm">
            {pd?.day ?? "—"}
          </span>
          {time && (
            <span className="mt-1 text-sm font-semibold leading-none tabular-nums text-gold/90">
              {time}
            </span>
          )}
          <span className="mt-1.5 text-2xs tracking-[0.02em] text-white/55">
            {pd ? `${pd.month}월${event.weekday ? ` · ${event.weekday}` : ""}` : event.date}
          </span>
        </div>

        {/* title + place / buy-in */}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-white transition-colors group-hover:text-gold sm:text-lg">
            {event.title}
          </h3>
          {meta.length > 0 && (
            <div className={`${display.className} mt-1.5 flex flex-wrap items-center text-xs text-white/55`}>
              {meta.map((m, i) => (
                <span key={i} className="inline-flex items-center">
                  {i > 0 && <span aria-hidden="true" className="mx-2 text-white/25">·</span>}
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* status + arrow */}
        <div className="flex items-center gap-3 sm:gap-5">
          <EventStatusTag status={event.status} />
          <IconArrow
            size={16}
            className="hidden shrink-0 text-white/25 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-gold motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 sm:block"
          />
        </div>
      </Link>
    </li>
  );
}
