import { Space_Grotesk } from "next/font/google";
import type { BlindRow } from "@/lib/types";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export function BlindStructureTable({ rows }: { rows: BlindRow[] }) {
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-surface">
      <table className="w-full border-collapse text-sm text-white/80">
        <thead>
          <tr
            className={`${display.className} bg-white/[0.03] text-2xs uppercase tracking-[0.12em] text-white/40`}
          >
            <th scope="col" className="px-4 py-3 text-left font-medium">레벨</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">SB</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">BB</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Ante</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.row_type === "stage") {
              return (
                <tr key={row.id} className="border-t border-white/[0.08] bg-gold/[0.06]">
                  <td
                    colSpan={5}
                    className={`${display.className} px-4 py-2.5 text-center text-2xs font-semibold uppercase tracking-[0.14em] text-gold/85`}
                  >
                    {row.stage_note}
                  </td>
                </tr>
              );
            }

            if (row.row_type === "break") {
              return (
                <tr key={row.id} className="border-t border-white/[0.08] bg-white/[0.02]">
                  <td
                    colSpan={5}
                    className="px-4 py-2.5 text-center text-xs italic text-white/45"
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
                className="border-t border-white/[0.08] transition-colors hover:bg-white/[0.025]"
              >
                <td className="px-4 py-2.5 font-semibold text-white">{row.level_no}</td>
                <td className={`${display.className} px-4 py-2.5 text-right tabular-nums`}>
                  {row.sb ?? "-"}
                </td>
                <td className={`${display.className} px-4 py-2.5 text-right tabular-nums`}>
                  {row.bb ?? "-"}
                </td>
                <td className={`${display.className} px-4 py-2.5 text-right tabular-nums text-white/55`}>
                  {row.ante ?? "-"}
                </td>
                <td className={`${display.className} px-4 py-2.5 text-right tabular-nums text-white/55`}>
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
