import { SpecialPageForm } from "@/components/admin/SpecialPageForm";
import { createSpecialPage } from "@/app/admin/actions/specialPages";

export default async function NewSpecialPagePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>새 특수 페이지</h1>
      <SpecialPageForm action={createSpecialPage} />
    </div>
  );
}
