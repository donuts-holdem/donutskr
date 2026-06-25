import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/lib/data/events";
import { getStructureWithRows } from "@/lib/data/blindStructures";
import { BlindStructureTable } from "@/components/schedule/BlindStructureTable";
import { StatusBadge } from "@/components/schedule/StatusBadge";

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

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const isCompleted = event.status === "completed";

  const blindData = event.blind_structure_id
    ? await getStructureWithRows(event.blind_structure_id)
    : null;

  return (
    <div className={["py-8 flex flex-col gap-8", isCompleted ? "opacity-80" : ""].join(" ").trim()}>

      {/* Archive label */}
      {isCompleted && (
        <div className="flex items-center gap-2">
          <span className="bg-ink/10 text-ink/40 rounded-pill px-3 py-1 text-xs font-medium">
            아카이브
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h1
            className={[
              "text-2xl md:text-3xl font-bold leading-tight",
              isCompleted ? "text-ink/60" : "text-ink",
            ].join(" ")}
          >
            {event.title}
          </h1>
          <StatusBadge status={event.status} />
        </div>

        {event.round && (
          <span className="bg-gold/15 text-gold rounded-pill px-3 py-1 text-xs font-medium self-start">
            {event.round}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(event.date || event.weekday || event.start_time) && (
          <div className="flex flex-col gap-1 p-4 rounded-card border border-border bg-glass">
            <span className="text-xs text-ink/40 uppercase tracking-wider">일시</span>
            <span className={["text-sm font-medium", isCompleted ? "text-ink/50" : "text-ink"].join(" ")}>
              {[
                event.date,
                event.weekday ? `(${event.weekday})` : null,
                event.start_time,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
            {event.reg_close_time && (
              <span className="text-xs text-ink/40">
                레지 마감: {event.reg_close_time}
              </span>
            )}
          </div>
        )}

        {event.location && (
          <div className="flex flex-col gap-1 p-4 rounded-card border border-border bg-glass">
            <span className="text-xs text-ink/40 uppercase tracking-wider">장소</span>
            <span className={["text-sm font-medium", isCompleted ? "text-ink/50" : "text-ink"].join(" ")}>
              {event.location}
            </span>
            {event.address && (
              <span className="text-xs text-ink/40">{event.address}</span>
            )}
          </div>
        )}

        {event.buy_in && (
          <div className="flex flex-col gap-1 p-4 rounded-card border border-border bg-glass">
            <span className="text-xs text-ink/40 uppercase tracking-wider">참가비</span>
            <span className={["text-sm font-medium", isCompleted ? "text-ink/50" : "text-gold"].join(" ")}>
              {event.buy_in}P
            </span>
          </div>
        )}

        {event.event_type && (
          <div className="flex flex-col gap-1 p-4 rounded-card border border-border bg-glass">
            <span className="text-xs text-ink/40 uppercase tracking-wider">종류</span>
            <span className={["text-sm font-medium", isCompleted ? "text-ink/50" : "text-ink"].join(" ")}>
              {event.event_type}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="p-4 rounded-card border border-border bg-glass">
          <p className="text-sm text-ink/70 leading-relaxed whitespace-pre-line">
            {event.description}
          </p>
        </div>
      )}

      {/* Entry button */}
      {!isCompleted && event.entry_link && (
        <div>
          <a
            href={event.entry_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-coral-cta text-ink px-8 py-3 rounded-pill font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {event.button_label ?? "참가 신청하기"}
          </a>
        </div>
      )}

      {/* Blind structure */}
      {blindData && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink/80">
            블라인드 구조
            {blindData.structure.name && (
              <span className="ml-2 text-xs text-ink/40 font-normal">
                {blindData.structure.name}
              </span>
            )}
          </h2>
          <BlindStructureTable rows={blindData.rows} />
        </div>
      )}

      {/* Back link */}
      <div className="pt-4 border-t border-border">
        <Link
          href="/schedule"
          className="text-sm text-ink/40 hover:text-gold transition-colors"
        >
          ← 일정으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
