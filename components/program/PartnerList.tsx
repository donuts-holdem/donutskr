import Image from "next/image";
import Link from "next/link";
import type { Program } from "@/lib/types";
import { isExternalUrl } from "@/lib/program-display";

interface PartnerListProps {
  partners: Program[];
}

export function PartnerList({ partners }: PartnerListProps) {
  if (partners.length === 0) return null;

  return (
    <aside className="bg-glass border border-border rounded-card p-5">
      <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-widest mb-4">
        제휴 파트너
      </h3>
      <ul className="flex flex-col gap-3">
        {partners.map((p) => {
          const href = p.external_url ?? p.entry_link;
          const inner = (
            <div className="flex items-center gap-3 group">
              {p.cover_image ? (
                <div className="relative w-9 h-9 rounded-[10px] overflow-hidden bg-ink/10 shrink-0">
                  <Image
                    src={p.cover_image}
                    alt={p.title}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-[10px] bg-ink/10 flex items-center justify-center text-ink/30 text-sm shrink-0">
                  🤝
                </div>
              )}
              <span className="text-sm text-ink/80 group-hover:text-gold transition-colors truncate">
                {p.title}
              </span>
            </div>
          );

          if (href) {
            const isExternal = isExternalUrl(href);
            return (
              <li key={p.id}>
                {isExternal ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  <Link href={href}>{inner}</Link>
                )}
              </li>
            );
          }
          return <li key={p.id}>{inner}</li>;
        })}
      </ul>
    </aside>
  );
}
