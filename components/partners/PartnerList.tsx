import { ArrowUpRight } from "lucide-react";
import type { Partner } from "@/lib/partners/types";
import { orderedPartners } from "@/lib/partners/validation";

export function PartnerList({ partners, headingLevel = 2 }: { partners: Partner[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  if (!partners.length) return <p className="rounded-card border border-border px-6 py-8 text-sm text-ink/65">등록된 파트너가 없습니다.</p>;
  return <ul className="space-y-3">
    {orderedPartners(partners).map(partner => <li key={partner.id}>
      <a href={partner.url} target="_blank" rel="noopener noreferrer"
        className="group flex min-w-0 items-center gap-4 rounded-card border border-border bg-surface px-5 py-6 transition-colors hover:border-gold/40 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold active:bg-surface-hover sm:gap-6 sm:px-7">
        {partner.logo_url && <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border p-2 sm:size-20">
          {/* eslint-disable-next-line @next/next/no-img-element -- Stored partner logos retain their original format. */}
          <img src={partner.logo_url} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
        </div>}
        <div className="min-w-0 flex-1">
          <Heading className="break-words text-lg font-semibold tracking-tight text-ink sm:text-xl">{partner.name}</Heading>
          {partner.description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink/70">{partner.description}</p>}
        </div>
        <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-gold transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" />
        <span className="sr-only">새 탭에서 열기</span>
      </a>
    </li>)}
  </ul>;
}
