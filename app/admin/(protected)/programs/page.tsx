import Link from "next/link";
import { getAllPrograms } from "@/lib/data/programs";

export default async function AdminProgramsPage() {
  const programs = await getAllPrograms();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>프로그램 관리</h1>
        <Link
          href="/admin/programs/new"
          className="text-bg"
          style={{
            background: "var(--color-gold)",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          + 새 프로그램
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr className="border-b border-white/12">
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>제목</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>그룹</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>HOT</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>제휴</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>노출</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id} className="border-b border-white/6">
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{program.title}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{program.program_group}</td>
                <td style={{ padding: "10px 12px" }}>
                  {program.is_hot ? (
                    <span style={{ color: "var(--color-gold)" }}>●</span>
                  ) : (
                    <span style={{ color: "var(--muted-4)" }}>○</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {program.is_affiliate ? (
                    <span style={{ color: "var(--color-gold)" }}>●</span>
                  ) : (
                    <span style={{ color: "var(--muted-4)" }}>○</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {program.is_visible ? (
                    <span style={{ color: "var(--color-gold)" }}>●</span>
                  ) : (
                    <span style={{ color: "var(--muted-4)" }}>○</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/programs/${program.id}/edit`}
                    style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>
                  등록된 프로그램이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
