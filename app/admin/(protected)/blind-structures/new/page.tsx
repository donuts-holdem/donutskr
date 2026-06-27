import { BlindStructureEditor } from "@/components/admin/BlindStructureEditor";
import { saveStructure } from "@/app/admin/actions/blindStructures";
import { getAllStructures } from "@/lib/data/blindStructures";

export default async function NewBlindStructurePage() {
  const structures = await getAllStructures();
  async function action(fd: FormData) {
    "use server";
    const name = String(fd.get("name") || "");
    const eventType = String(fd.get("event_type") || "").trim() || null;
    let rows: any[] = [];
    try { rows = JSON.parse(String(fd.get("rows") || "[]")); } catch {}
    await saveStructure(null, name, eventType, rows);
  }
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 스트럭처</h1>
      <BlindStructureEditor structureId="" initialRows={[]} action={action} structures={structures} />
    </div>
  );
}
