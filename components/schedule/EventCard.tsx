import Link from "next/link";
import Image from "next/image";
import type { Event } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function EventCard({ event }: { event: Event }) {
  const isCompleted = event.status === "completed";

  return (
    <Link
      href={`/schedule/${event.id}`}
      className={[
        "block rounded-card border border-border bg-glass",
        "overflow-hidden transition-opacity",
        isCompleted ? "opacity-60 hover:opacity-80" : "hover:border-gold/40",
      ].join(" ")}
    >
      {/* Poster */}
      {event.poster_image && (
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <Image
            src={event.poster_image}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-ink font-semibold text-base leading-tight flex-1 min-w-0">
            {event.title}
          </h3>
          <StatusBadge status={event.status} />
        </div>

        {/* Meta */}
        <dl className="flex flex-col gap-1 text-xs text-ink/50">
          {event.location && (
            <div className="flex gap-1">
              <dt className="sr-only">장소</dt>
              <dd>{event.location}</dd>
            </div>
          )}
          {event.date && (
            <div className="flex gap-1">
              <dt className="sr-only">날짜</dt>
              <dd>
                {event.date}
                {event.weekday && ` (${event.weekday})`}
                {event.start_time && ` ${event.start_time}`}
              </dd>
            </div>
          )}
          {event.buy_in && (
            <div className="flex gap-1">
              <dt className="sr-only">참가비</dt>
              <dd className="text-gold/80">{event.buy_in}</dd>
            </div>
          )}
        </dl>

        {isCompleted && (
          <p className="text-xs text-ink/30 mt-1">아카이브</p>
        )}
      </div>
    </Link>
  );
}
