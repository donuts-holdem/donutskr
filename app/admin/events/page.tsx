import Link from "next/link";
import { getEvents } from "@/lib/data/events";

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>이벤트 관리</h1>
        <Link
          href="/admin/events/new"
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
          + 새 이벤트
        </Link>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr className="border-b border-white/[0.12]" style={{}}>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>제목</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>카테고리</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>상태</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>노출</th>
              <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--muted-2)", fontWeight: "500" }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-white/[0.06]" style={{}}>
                <td style={{ padding: "10px 12px", color: "var(--color-ink)" }}>{event.title}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{event.category}</td>
                <td style={{ padding: "10px 12px", color: "var(--muted-2)" }}>{event.status}</td>
                <td style={{ padding: "10px 12px" }}>
                  {event.is_visible ? (
                    <span style={{ color: "var(--color-gold)" }}>●</span>
                  ) : (
                    <span style={{ color: "var(--muted-4)" }}>○</span>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    style={{ color: "var(--color-gold)", textDecoration: "none", fontSize: "0.8rem" }}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-3)" }}>
                  등록된 이벤트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
