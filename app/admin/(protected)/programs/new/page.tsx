import { ProgramForm } from "@/components/admin/ProgramForm";
import { createProgram } from "@/app/admin/actions/programs";
import { getProgramOptions } from "@/lib/data/programOptions";

export default async function NewProgramPage() {
  const [groupOptions, statusOptions] = await Promise.all([
    getProgramOptions("group"),
    getProgramOptions("status"),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 프로그램 생성</h1>
      <ProgramForm action={createProgram} groupOptions={groupOptions} statusOptions={statusOptions} />
    </div>
  );
}
