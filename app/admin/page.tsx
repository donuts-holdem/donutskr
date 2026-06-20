import Link from "next/link";
import { getActiveSeason } from "@/lib/data/seasons";

export default async function AdminPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-gold)" }}>관리자 대시보드</h1>
      {activeSeason ? (
        <p className="text-sm mb-6" style={{ color: "var(--muted-2)" }}>
          현재 활성 시즌: <span style={{ color: "var(--color-ink)" }}>{activeSeason.name} ({activeSeason.year})</span>
        </p>
      ) : (
        <p className="text-sm mb-6" style={{ color: "var(--muted-2)" }}>활성 시즌 없음</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        <Link
          href="/admin/seasons"
          className="bg-white/[0.06] border border-white/[0.12]"
          style={{
            display: "block",
            padding: "1.25rem",
            borderRadius: "10px",
            color: "var(--color-ink)",
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🗓</div>
          <div style={{ fontWeight: "600" }}>시즌 관리</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-3)", marginTop: "4px" }}>시즌 생성·수정·활성화</div>
        </Link>

        <Link
          href="/admin/events"
          className="bg-white/[0.06] border border-white/[0.12]"
          style={{
            display: "block",
            padding: "1.25rem",
            borderRadius: "10px",
            color: "var(--color-ink)",
            textDecoration: "none",
          }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎯</div>
          <div style={{ fontWeight: "600" }}>이벤트 관리</div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted-3)", marginTop: "4px" }}>이벤트 생성·수정·삭제</div>
        </Link>
      </div>
    </div>
  );
}
