import Link from "next/link";
import { getAllTabs } from "@/lib/data/tabs";
import { deleteTab } from "@/app/admin/actions/tabs";
import { DeleteButton } from "@/components/admin/DeleteButton";

export default async function TabsPage() {
  const tabs = await getAllTabs();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>탭 관리</h1>
        <Link href="/admin/tabs/new" style={{ background: "var(--color-gold)", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", textDecoration: "none", fontSize: "0.875rem" }} className="text-bg">
          + 새 탭
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr className="border-b border-white/12">
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>이름</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>키</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>순서</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>노출</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>기간 노출</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {tabs.map((tab) => (
              <tr key={tab.id} className="border-b border-white/6">
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{tab.name}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{tab.key}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{tab.sort_order}</td>
                <td style={{ padding: "10px 12px" }}>{tab.is_visible ? <span style={{ color: "var(--color-gold)" }}>●</span> : <span style={{ color: "var(--muted-4)" }}>○</span>}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)", fontSize: "0.75rem" }}>
                  {tab.start_show_date || tab.end_show_date ? `${tab.start_show_date ?? "∞"} ~ ${tab.end_show_date ?? "∞"}` : "-"}
                </td>
                <td style={{ padding: "10px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Link href={`/admin/tabs/${tab.id}/edit`} style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}>수정</Link>
                  <DeleteButton onDelete={async () => { "use server"; await deleteTab(tab.id); }} />
                </td>
              </tr>
            ))}
            {tabs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>탭이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
