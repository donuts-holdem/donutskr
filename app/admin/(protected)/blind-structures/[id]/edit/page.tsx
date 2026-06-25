import { BlindStructureEditor } from "@/components/admin/BlindStructureEditor";
import { saveStructure } from "@/app/admin/actions/blindStructures";
import { getStructureWithRows, getAllStructures } from "@/lib/data/blindStructures";
import { notFound } from "next/navigation";

export default async function EditBlindStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, structures] = await Promise.all([getStructureWithRows(id), getAllStructures()]);
  if (!result) notFound();
  const { structure, rows } = result;

  async function action(fd: FormData) {
    "use server";
    const name = String(fd.get("name") || "");
    const eventType = String(fd.get("event_type") || "").trim() || null;
    let rowData: any[] = [];
    try { rowData = JSON.parse(String(fd.get("rows") || "[]")); } catch {}
    await saveStructure(id, name, eventType, rowData);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>스트럭처 수정</h1>
      <BlindStructureEditor structureId={id} initialRows={rows} action={action} structures={structures} initialName={structure.name} initialEventType={structure.event_type} />
    </div>
  );
}
