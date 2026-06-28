import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getEventById } from "@/lib/data/events";
import { getStructureWithRows } from "@/lib/data/blindStructures";
import { BlindStructureTable } from "@/components/schedule/BlindStructureTable";
import { StatusBadge } from "@/components/schedule/StatusBadge";
import { display, eventTime, IconArrow } from "@/components/schedule/fixtures";
import { formatDotDate } from "@/lib/program-display";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "이벤트 없음 | DO:NUTS" };

  return {
    title: `${event.title} | DO:NUTS`,
    description: event.description ?? `${event.title} - DO:NUTS 포커 이벤트`,
    openGraph: {
      title: event.title,
      description: event.description ?? `${event.title} - DO:NUTS 포커 이벤트`,
      images: event.poster_image ? [{ url: event.poster_image }] : undefined,
    },
  };
}

/* ----------------------------- icons ----------------------------- */
function Line({ d, size = 16, className }: { d: string; size?: number; className?: string }) {
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
      <path d={d} />
    </svg>
  );
}
const IconDate = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
);
const IconPin = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
);
const IconChip = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 3v4 M12 17v4 M3 12h4 M17 12h4" />
);
const IconClock = (p: { size?: number; className?: string }) => (
  <Line {...p} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.5V12l3 2" />
);

/* ------------------------- info card row ------------------------- */
function InfoRow({
  label,
  children,
  note,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  note?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.16em] text-gold/80`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${accent ? "text-gold" : "text-white"}`}>
        {children}
      </span>
      {note && <span className="text-2xs text-white/45">{note}</span>}
    </div>
  );
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const isCompleted = event.status === "completed";

  const blindData = event.blind_structure_id
    ? await getStructureWithRows(event.blind_structure_id)
    : null;

  const dateLabel = event.date ? formatDotDate(event.date) : null;
  const time = eventTime(event);
  const whenValue = dateLabel
    ? `${dateLabel}${event.weekday ? ` (${event.weekday})` : ""}`
    : event.date ?? "일정 미정";

  // Live timer is only meaningful while the event is live or about to be.
  const showTimer = !isCompleted && Boolean(event.timer_event_url);

  return (
    <div
      className="flex flex-col gap-10 py-10 text-white touch-manipulation"
      style={{ fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif' }}
    >
      {/* Breadcrumb */}
      <Link
        href="/schedule"
        className={`${display.className} group inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm`}
      >
        <IconArrow size={14} className="rotate-180 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />
        전체 일정
      </Link>

      {/* Hero */}
      <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={event.status} />
          {event.event_type && (
            <span className="inline-flex items-center rounded-pill bg-white/[0.06] px-3 py-1 text-2xs font-medium text-white/65">
              {event.event_type}
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center rounded-pill bg-white/[0.04] px-3 py-1 text-2xs font-medium text-white/40">
              아카이브
            </span>
          )}
        </div>

        <h1 className="text-balance text-display-lg font-bold leading-[1.08] tracking-[-0.03em] text-white sm:text-display-xl">
          {event.title}
        </h1>

        {/* Quick meta */}
        <div className={`${display.className} flex flex-wrap items-center gap-x-5 gap-y-2 text-sm tabular-nums text-white/55`}>
          {dateLabel && (
            <span className="inline-flex items-center gap-1.5">
              <IconDate size={15} className="text-white/35" />
              {whenValue}
            </span>
          )}
          {time && (
            <span className="inline-flex items-center gap-1.5 text-gold/90">
              <IconClock size={15} className="text-gold/60" />
              {time}
            </span>
          )}
          {event.location && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <IconPin size={15} className="shrink-0 text-white/35" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      </header>

      {/* Body */}
      <section className="flex flex-col items-start gap-8 lg:flex-row lg:gap-10">
        {/* Left: poster + description + blind structure */}
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {event.poster_image && (
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/[0.08]">
              <Image
                src={event.poster_image}
                alt={event.title}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority
              />
            </div>
          )}

          {event.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/75">
              {event.description}
            </p>
          )}

          {blindData && (
            <section className="flex flex-col gap-4">
              <div className="flex items-baseline gap-3">
                <h2 className="text-base font-semibold text-white">블라인드 구조</h2>
                {blindData.structure.name && (
                  <span className={`${display.className} text-xs uppercase tracking-[0.1em] text-white/40`}>
                    {blindData.structure.name}
                  </span>
                )}
              </div>
              <BlindStructureTable rows={blindData.rows} />
            </section>
          )}
        </div>

        {/* Right: structured facts + CTA */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-24 lg:w-80">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <InfoRow
              label="일시"
              note={event.reg_close_time ? `레지 마감 ${event.reg_close_time}` : null}
            >
              {whenValue}
              {time && <span className="ml-1.5 text-gold/90">· {time}</span>}
            </InfoRow>

            {event.location && (
              <>
                <span className="h-px w-full bg-white/[0.06]" />
                <InfoRow label="장소" note={event.address}>
                  {event.location}
                </InfoRow>
              </>
            )}

            {event.buy_in && (
              <>
                <span className="h-px w-full bg-white/[0.06]" />
                <InfoRow label="참가비" accent>
                  <span className={display.className}>{event.buy_in}</span>
                </InfoRow>
              </>
            )}

            {event.event_type && (
              <>
                <span className="h-px w-full bg-white/[0.06]" />
                <InfoRow label="종류">{event.event_type}</InfoRow>
              </>
            )}
          </div>

          {/* CTAs */}
          {!isCompleted && event.entry_link && (
            <a
              href={event.entry_link}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-pill bg-coral-cta px-8 py-3.5 text-sm font-semibold text-white transition-[transform,opacity] hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {event.button_label ?? "참가 신청하기"}
              <IconArrow size={16} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>
          )}

          {showTimer && (
            <a
              href={event.timer_event_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={`${display.className} inline-flex w-full items-center justify-center gap-2 rounded-pill border border-white/15 px-8 py-3 text-sm font-semibold uppercase tracking-[0.04em] text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
            >
              <IconChip size={16} className="text-gold/80" />
              라이브 타이머
            </a>
          )}

          {isCompleted && (
            <p className="px-1 text-center text-2xs text-white/40">
              종료된 이벤트입니다. 다음 시즌에서 만나요.
            </p>
          )}
        </aside>
      </section>

      {/* Back link */}
      <div className="border-t border-white/[0.08] pt-6">
        <Link
          href="/schedule"
          className={`${display.className} group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-gold`}
        >
          <IconArrow size={14} className="rotate-180 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" />
          전체 일정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
