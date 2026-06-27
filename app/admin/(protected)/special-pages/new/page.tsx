import { SpecialPageForm } from "@/components/admin/SpecialPageForm";
import { createSpecialPage } from "@/app/admin/actions/specialPages";
import { getAllStructures } from "@/lib/data/blindStructures";

export default async function NewSpecialPagePage() {
  const structures = await getAllStructures();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 특수 페이지</h1>
      <SpecialPageForm action={createSpecialPage} structures={structures} />
    </div>
  );
}
