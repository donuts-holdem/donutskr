import type { BlindRow } from "@/lib/types";

export function BlindStructureTable({ rows }: { rows: BlindRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-sm text-ink/80 border-collapse">
        <thead>
          <tr className="bg-ink/5 text-ink/40 text-xs uppercase tracking-wider">
            <th className="px-3 py-2 text-left">레벨</th>
            <th className="px-3 py-2 text-right">SB</th>
            <th className="px-3 py-2 text-right">BB</th>
            <th className="px-3 py-2 text-right">Ante</th>
            <th className="px-3 py-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.row_type === "stage") {
              return (
                <tr
                  key={row.id}
                  className="bg-gold/5 border-t border-border"
                >
                  <td
                    colSpan={5}
                    className="px-3 py-2 text-center text-xs font-semibold text-gold/80 uppercase tracking-wide"
                  >
                    {row.stage_note}
                  </td>
                </tr>
              );
            }

            if (row.row_type === "break") {
              return (
                <tr
                  key={row.id}
                  className="bg-ink/5 border-t border-border"
                >
                  <td
                    colSpan={5}
                    className="px-3 py-2 text-center text-xs text-ink/50 italic"
                  >
                    {row.break_name}
                    {row.break_minutes != null && ` (${row.break_minutes}분)`}
                  </td>
                </tr>
              );
            }

            // level row
            return (
              <tr
                key={row.id}
                className="border-t border-border hover:bg-ink/5 transition-colors"
              >
                <td className="px-3 py-2 font-medium">{row.level_no}</td>
                <td className="px-3 py-2 text-right">{row.sb ?? "-"}</td>
                <td className="px-3 py-2 text-right">{row.bb ?? "-"}</td>
                <td className="px-3 py-2 text-right">{row.ante ?? "-"}</td>
                <td className="px-3 py-2 text-right">
                  {row.duration != null ? `${row.duration}m` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
