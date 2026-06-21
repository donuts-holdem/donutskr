import Image from "next/image";
import Link from "next/link";
import type { SpecialPage, BlindRow, BlindStructure } from "@/lib/types";
import { BlindStructureTable } from "@/components/schedule/BlindStructureTable";

export interface StructureWithRows {
  structure: BlindStructure;
  rows: BlindRow[];
}

interface Props {
  page: SpecialPage;
  structure?: StructureWithRows | null;
}

export function SpecialPageView({ page, structure }: Props) {
  const ctaIsExternal = page.entry_link
    ? !page.entry_link.startsWith("/")
    : false;

  return (
    <div className="flex flex-col gap-10">
      {/* Title / description */}
      <section className="flex flex-col gap-3">
        {page.label && (
          <span className="inline-flex self-start px-3 py-1 rounded-pill bg-glass border border-border text-xs text-gold font-medium tracking-wide">
            {page.label}
          </span>
        )}
        <h1 className="text-3xl font-bold text-ink leading-tight">{page.title}</h1>
        {page.description && (
          <p className="text-ink/70 text-sm leading-relaxed whitespace-pre-line">
            {page.description}
          </p>
        )}
      </section>

      {/* Info cards */}
      {page.info_cards.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {page.info_cards.map((card, i) => (
            <div
              key={i}
              className="bg-glass border border-border rounded-card px-4 py-3 flex flex-col gap-1"
            >
              <span className="text-xs text-ink/40 uppercase tracking-widest">
                {card.label}
              </span>
              <span className="font-semibold text-ink text-sm">{card.value}</span>
            </div>
          ))}
        </section>
      )}

      {/* Poster + Gallery */}
      {(page.poster || page.gallery.length > 0) && (
        <section className="flex flex-col gap-4">
          {page.poster && (
            <div className="relative w-full max-w-sm rounded-card overflow-hidden aspect-[3/4]">
              <Image
                src={page.poster}
                alt={page.title}
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                className="object-cover"
                priority
              />
            </div>
          )}
          {page.gallery.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {page.gallery.map((imgUrl, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-card overflow-hidden"
                >
                  <Image
                    src={imgUrl}
                    alt={`갤러리 이미지 ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Note list */}
      {page.note_list.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-ink/40 uppercase tracking-widest">
            안내사항
          </h2>
          <ul className="flex flex-col gap-2">
            {page.note_list.map((note, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink/70 leading-relaxed">
                <span className="shrink-0 text-gold/60 mt-0.5">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sponsor */}
      {page.sponsor_name && (
        <section className="flex items-center gap-3">
          <span className="text-xs text-ink/30 uppercase tracking-widest">Sponsor</span>
          {page.sponsor_logo ? (
            <div className="relative h-8 w-24">
              <Image
                src={page.sponsor_logo}
                alt={page.sponsor_name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <span className="text-sm text-ink/50 font-medium">{page.sponsor_name}</span>
          )}
        </section>
      )}

      {/* CTA button */}
      {page.entry_link && (
        <section>
          {ctaIsExternal ? (
            <a
              href={page.entry_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 rounded-pill bg-coral-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {page.cta_label ?? "참가 신청하기"}
            </a>
          ) : (
            <Link
              href={page.entry_link}
              className="inline-flex items-center justify-center px-8 py-3 rounded-pill bg-coral-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {page.cta_label ?? "참가 신청하기"}
            </Link>
          )}
        </section>
      )}

      {/* Blind structure table */}
      {structure && structure.rows.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gold">블라인드 구조</h2>
          <p className="text-xs text-ink/40">{structure.structure.name}</p>
          <BlindStructureTable rows={structure.rows} />
        </section>
      )}
    </div>
  );
}
