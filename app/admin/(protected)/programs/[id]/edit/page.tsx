import { notFound } from "next/navigation";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { updateProgram, deleteProgram } from "@/app/admin/actions/programs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";
import { VerifyCutover } from "@/components/admin/VerifyCutover";
import { ProgramBlocks } from "@/components/program/ProgramBlocks";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProgram } from "@/lib/data/programs";

// Sanitize config mirrors the public page pipeline in app/(site)/programs/[slug]/page.tsx
const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProgramPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const program = mapProgram(data);
  const blocks = program.description_blocks;

  // Compute legacy HTML preview only when blocks exist (side-by-side comparison)
  const legacyHtml =
    blocks !== null && program.description
      ? sanitizeHtml(await marked.parse(program.description), SANITIZE_CONFIG)
      : null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>
          프로그램 수정: {program.title}
        </h1>
        <ViewOnSiteLink href={`/programs/${program.slug}`} />
      </div>

      {/* Side-by-side preview — only when description_blocks is present */}
      {blocks !== null && (
        <div className="mb-8 rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            렌더러 비교 미리보기
          </h2>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: legacy markdown render */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">기존 (마크다운)</p>
              <div className="rounded-lg border border-border bg-background p-4 overflow-y-auto max-h-96">
                {legacyHtml ? (
                  <div
                    className="prose-dark text-ink/80 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: legacyHtml }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">설명 없음</p>
                )}
              </div>
            </div>
            {/* Right: block renderer */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">블록</p>
              <div className="rounded-lg border border-border bg-background p-4 overflow-y-auto max-h-96">
                <ProgramBlocks blocks={blocks} />
              </div>
            </div>
          </div>
          {/* Verify controls — separate from the ProgramForm 저장 button */}
          <div className="pt-3 border-t border-border">
            <VerifyCutover id={program.id} verified={program.description_verified} />
          </div>
        </div>
      )}

      <ProgramForm program={program} action={updateProgram.bind(null, id)} />
      <div className="border-t border-white/10" style={{ marginTop: "2rem", paddingTop: "1.5rem" }}>
        <p style={{ color: "var(--muted-3)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>위험 구역</p>
        <DeleteButton onDelete={deleteProgram.bind(null, id)} />
      </div>
    </div>
  );
}
