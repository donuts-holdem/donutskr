import Link from "next/link";
import Image from "next/image";
import type { Program } from "@/lib/types";
import { programStatusLabel, formatDotDate, resolveHref } from "@/lib/program-display";

function getProgramHref(program: Program): { href: string; isExternal: boolean } {
  if (program.external_url) {
    return resolveHref(program.external_url);
  }
  return { href: `/programs/${program.slug}`, isExternal: false };
}

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const { href, isExternal } = getProgramHref(program);

  const inner = (
    <div className="flex gap-4 items-stretch bg-glass border border-border rounded-card p-4 hover:border-gold/30 transition-colors group">
      {/* Left: Square thumbnail */}
      <div className="relative shrink-0 w-20 h-20 rounded-[16px] overflow-hidden bg-ink/10">
        {program.cover_image ? (
          <Image
            src={program.cover_image}
            alt={program.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink/20 text-2xl">
            🃏
          </div>
        )}
      </div>

      {/* Right: Text */}
      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        {/* Row 1: category · status / member_count */}
        <div className="flex items-center justify-between gap-2 text-xs text-ink/50">
          <span className="truncate">{program.category ?? program.program_group}</span>
          <div className="flex items-center gap-2 shrink-0">
            {program.status && (
              <span className="text-gold/80">{programStatusLabel(program.status)}</span>
            )}
            {program.member_count > 0 && (
              <span>{program.member_count}명</span>
            )}
          </div>
        </div>

        {/* Row 2: title · date / location */}
        <div className="flex items-end justify-between gap-2 mt-1">
          <span className="font-semibold text-ink text-sm leading-snug truncate group-hover:text-gold transition-colors">
            {program.title}
          </span>
          <div className="text-xs text-ink/40 shrink-0 text-right leading-snug">
            {program.start_date && (
              <div>{formatDotDate(program.start_date)}</div>
            )}
            {program.location && <div>{program.location}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return <Link href={href} className="block">{inner}</Link>;
}
