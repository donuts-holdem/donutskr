import { notFound } from "next/navigation";
import { ProgramForm } from "@/components/admin/ProgramForm";
import { updateProgram, deleteProgram } from "@/app/admin/actions/programs";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProgram } from "@/lib/data/programs";

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>
        프로그램 수정: {program.title}
      </h1>
      <ProgramForm program={program} action={updateProgram.bind(null, id)} />
      <div className="border-t border-white/10" style={{ marginTop: "2rem", paddingTop: "1.5rem" }}>
        <p style={{ color: "var(--muted-3)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>위험 구역</p>
        <DeleteButton onDelete={deleteProgram.bind(null, id)} />
      </div>
    </div>
  );
}
