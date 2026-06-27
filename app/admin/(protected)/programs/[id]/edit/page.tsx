import { notFound } from "next/navigation";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { PROGRAM_SANITIZE_CONFIG } from "@/lib/program-sanitize";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { updateProgram, deleteProgram } from "@/app/admin/actions/programs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";
import { blocksToHtml } from "@/lib/program-blocks-to-html";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProgram } from "@/lib/data/programs";
import type { Block } from "@/lib/program-blocks";

interface Props {
  params: Promise<{ id: string }>;
}

async function computeInitialHtml(blocks: Block[] | null, description: string | null): Promise<string> {
  // Already-WYSIWYG: a single raw block holds the document verbatim.
  if (blocks && blocks.length === 1 && blocks[0].type === "raw") return blocks[0].html;
  // Structured blocks: convert to HTML for editing.
  if (blocks && blocks.length > 0) return blocksToHtml(blocks);
  // Legacy markdown fallback.
  if (description) return sanitizeHtml(await marked.parse(description), PROGRAM_SANITIZE_CONFIG);
  return "";
}

export default async function EditProgramPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const program = mapProgram(data);
  const initialHtml = await computeInitialHtml(program.description_blocks, program.description);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gold">프로그램 수정: {program.title}</h1>
        <ViewOnSiteLink href={`/programs/${program.slug}`} />
      </div>

      <ProgramForm
        program={program}
        descriptionInitialHtml={initialHtml}
        action={updateProgram.bind(null, id)}
      />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-muted-foreground text-xs mb-3">위험 구역</p>
        <DeleteButton onDelete={deleteProgram.bind(null, id)} />
      </div>
    </div>
  );
}
