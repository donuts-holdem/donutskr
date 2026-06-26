import Link from "next/link";
import { getAllStructures } from "@/lib/data/blindStructures";
import { deleteStructure } from "@/app/admin/actions/blindStructures";
import { DeleteButton } from "@/components/admin/DeleteButton";

export default async function BlindStructuresPage() {
  const structures = await getAllStructures();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>블라인드 스트럭처</h1>
        <Link href="/admin/blind-structures/new"
          style={{ background: "var(--color-gold)", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", textDecoration: "none", fontSize: "0.875rem" }}
          className="text-bg">
          + 새 스트럭처
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr className="border-b border-white/12">
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>이름</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.id} className="border-b border-white/6">
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{s.name}</td>
                <td style={{ padding: "10px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Link href={`/admin/blind-structures/${s.id}/edit`}
                    style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}>수정</Link>
                  <DeleteButton onDelete={async () => { "use server"; await deleteStructure(s.id); }} />
                </td>
              </tr>
            ))}
            {structures.length === 0 && (
              <tr><td colSpan={2} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>스트럭처가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
