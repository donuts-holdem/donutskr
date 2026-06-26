import Link from "next/link";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { deleteSpecialPage } from "@/app/admin/actions/specialPages";
import { DeleteButton } from "@/components/admin/DeleteButton";

export default async function SpecialPagesPage() {
  const pages = await getAllSpecialPages();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>특수 페이지</h1>
        <Link href="/admin/special-pages/new" style={{ background: "var(--color-gold)", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", textDecoration: "none", fontSize: "0.875rem" }} className="text-bg">
          + 새 페이지
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr className="border-b border-white/12">
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>슬러그</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>제목</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>노출</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-white/6">
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{p.slug}</td>
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{p.title}</td>
                <td style={{ padding: "10px 12px" }}>{p.is_visible ? <span style={{ color: "var(--color-gold)" }}>●</span> : <span style={{ color: "var(--muted-4)" }}>○</span>}</td>
                <td style={{ padding: "10px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Link href={`/admin/special-pages/${p.id}/edit`} style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}>수정</Link>
                  <DeleteButton onDelete={async () => { "use server"; await deleteSpecialPage(p.id); }} />
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>특수 페이지가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
