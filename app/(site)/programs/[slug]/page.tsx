import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { getProgramBySlug, getHotPrograms } from "@/lib/data/programs";
import { ProgramCard } from "@/components/program/ProgramCard";
import { ProgramBlocks } from "@/components/program/ProgramBlocks";
import { hasVisibleContent } from "@/lib/program-blocks";
import { programStatusLabel, formatDotDate, isExternalUrl } from "@/lib/program-display";

type Props = { params: Promise<{ slug: string }> };

// Fully dynamic: data is read through cookies()-based Supabase clients (also in the
// root layout), so this route can never be statically prerendered. Marking it
// force-dynamic avoids the SSG path that throws DYNAMIC_SERVER_USAGE at runtime.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return { title: "프로그램 없음 | DO:NUTS" };

  return {
    title: `${program.title} | DO:NUTS`,
    description: program.description
      ? program.description.slice(0, 120)
      : `${program.title} - DO:NUTS 프로그램`,
    openGraph: {
      title: program.title,
      description: program.description?.slice(0, 120) ?? `${program.title} - DO:NUTS`,
      images: program.cover_image ? [{ url: program.cover_image }] : undefined,
    },
  };
}

function ExternalNotice({ url }: { url: string }) {
  const isExternal = isExternalUrl(url);
  const label = isExternal ? "외부 사이트에서 운영되는 프로그램입니다." : "별도 페이지에서 확인할 수 있습니다.";

  return (
    <div className="bg-glass border border-border rounded-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <p className="text-ink/60 text-sm flex-1">{label}</p>
      {isExternal ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-5 py-2 rounded-pill bg-coral-cta text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          바로가기 →
        </a>
      ) : (
        <Link
          href={url}
          className="shrink-0 px-5 py-2 rounded-pill bg-coral-cta text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          바로가기 →
        </Link>
      )}
    </div>
  );
}

export default async function ProgramDetailPage({ params }: Props) {
  const { slug } = await params;
  const [program, hotPrograms] = await Promise.all([
    getProgramBySlug(slug),
    getHotPrograms(),
  ]);

  if (!program) notFound();

  // Sanitize rendered markdown before injecting — admin content today, but a
  // dangerouslySetInnerHTML sink fed by stored data must not pass raw HTML/JS.
  const descHtml = program.description
    ? sanitizeHtml(await marked.parse(program.description), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ["href", "name", "target", "rel"],
          img: ["src", "alt", "title", "width", "height"],
        },
        allowedSchemes: ["http", "https", "mailto"],
      })
    : null;

  const useBlocks =
    program.description_verified &&
    Array.isArray(program.description_blocks) &&
    program.description_blocks.length > 0 &&
    hasVisibleContent(program.description_blocks);

  const relatedPrograms = hotPrograms.filter((p) => p.slug !== slug).slice(0, 4);

  const ctaHref = program.entry_link ?? program.external_url ?? null;
  const ctaLabel = program.cta_label ?? "참가 신청";
  const ctaIsExternal = ctaHref ? isExternalUrl(ctaHref) : false;

  return (
    <div className="py-8 flex flex-col gap-10">
      {/* External URL notice */}
      {program.external_url && <ExternalNotice url={program.external_url} />}

      {/* Hero */}
      <section className="flex flex-col gap-3">
        {program.category && (
          <span className="inline-flex self-start px-3 py-1 rounded-pill bg-glass border border-border text-xs text-gold font-medium tracking-wide">
            {program.category}
          </span>
        )}
        <h1 className="text-3xl font-bold text-ink leading-tight">{program.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-ink/50">
          {program.status && (
            <span className="text-gold/80 font-medium">{programStatusLabel(program.status)}</span>
          )}
          {program.member_count > 0 && <span><span aria-hidden="true">👥</span> {program.member_count}명</span>}
          {program.location && <span><span aria-hidden="true">📍</span> {program.location}</span>}
          {program.start_date && (
            <span><span aria-hidden="true">📅</span> {formatDotDate(program.start_date)}</span>
          )}
        </div>
      </section>

      {/* 2-col body */}
      <section className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: poster + description */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {program.cover_image && (
            <div className="relative w-full max-w-sm rounded-card overflow-hidden aspect-square">
              <Image
                src={program.cover_image}
                alt={program.title}
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                className="object-cover"
                priority
              />
            </div>
          )}

          {useBlocks ? (
            <ProgramBlocks blocks={program.description_blocks!} />
          ) : (
            descHtml && (
              <div
                className="prose-dark text-ink/80 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: descHtml }}
              />
            )
          )}
        </div>

        {/* Right: manager card + CTA */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          {/* Manager card */}
          {program.manager_name && (
            <div className="bg-glass border border-border rounded-card p-5 flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-widest">
                담당자
              </h3>
              <div className="flex items-center gap-3">
                {program.manager_avatar ? (
                  <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={program.manager_avatar}
                      alt={program.manager_name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full bg-ink/10 flex items-center justify-center text-ink/30 shrink-0">
                    👤
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-sm">{program.manager_name}</p>
                  {program.manager_role && (
                    <p className="text-xs text-ink/50 truncate">{program.manager_role}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {ctaHref && (
            ctaIsExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-pill bg-coral-cta text-white text-center font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {ctaLabel}
              </a>
            ) : (
              <Link
                href={ctaHref}
                className="block w-full py-3 rounded-pill bg-coral-cta text-white text-center font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                {ctaLabel}
              </Link>
            )
          )}
        </div>
      </section>

      {/* Related HOT programs */}
      {relatedPrograms.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span>🔥</span>
            <h2 className="text-base font-bold text-ink">HOT 프로그램</h2>
          </div>
          <div className="flex flex-col gap-3">
            {relatedPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
