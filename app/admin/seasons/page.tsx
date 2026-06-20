import Link from "next/link";
import { getAllSeasons } from "@/lib/data/seasons";
import { activateSeason, deleteSeason } from "@/app/admin/actions/seasons";
import { DeleteButton } from "@/components/admin/DeleteButton";

export default async function AdminSeasonsPage() {
  const seasons = await getAllSeasons();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>시즌 관리</h1>
        <Link
          href="/admin/seasons/new"
          style={{
            background: "var(--color-gold)",
            color: "#000",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          + 새 시즌
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>이름</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>코드</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>연도</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>활성</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{season.name}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{season.code}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{season.year}</td>
                <td style={{ padding: "10px 12px" }}>
                  {season.is_active ? (
                    <span style={{ color: "var(--color-gold)", fontWeight: "600" }}>● 활성</span>
                  ) : (
                    <form action={activateSeason.bind(null, season.id)} style={{ display: "inline" }}>
                      <button
                        type="submit"
                        style={{
                          background: "rgba(255,229,138,0.12)",
                          border: "1px solid rgba(255,229,138,0.3)",
                          color: "var(--color-gold)",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        활성화
                      </button>
                    </form>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Link
                      href={`/admin/seasons/${season.id}/edit`}
                      style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}
                    >
                      수정
                    </Link>
                    <DeleteButton onDelete={deleteSeason.bind(null, season.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>
                  등록된 시즌이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
