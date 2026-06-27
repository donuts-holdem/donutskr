import { ProgramForm } from "@/components/admin/ProgramForm";
import { createProgram } from "@/app/admin/actions/programs";

export default async function NewProgramPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 프로그램 생성</h1>
      <ProgramForm action={createProgram} />
    </div>
  );
}
