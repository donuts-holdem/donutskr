import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/data/siteConfig";
import { SeriesNav } from "@/components/series/SeriesNav";
import { assertPublicHttpsUrl } from "@/lib/safe-url";

export const metadata: Metadata = {
  title: "리더보드 | DO:NUTS",
  description: "DO:NUTS 포인트 순위",
};

// Shape returned by the DO:NUTS leaderboard Google Apps Script:
// { personal: [{rank:"01", name, point:"1,674,000"}], university: [...], updatedAt }
interface LeaderboardEntry {
  rank: string;
  name: string;
  point: string;
}

interface LeaderboardData {
  personal?: LeaderboardEntry[];
  university?: LeaderboardEntry[];
  updatedAt?: string;
}

const isTop3 = (rank: string) => Number(rank) >= 1 && Number(rank) <= 3;

async function fetchLeaderboard(url: string): Promise<LeaderboardData | null> {
  try {
    // SSRF guard: validate scheme + resolve host, reject private/reserved targets.
    await assertPublicHttpsUrl(url);
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as LeaderboardData;
  } catch {
    return null;
  }
}

export default async function LeaderboardPage() {
  const siteConfig = await getSiteConfig();

  if (!siteConfig?.leaderboard_tab_visible) {
    notFound();
  }

  let data: LeaderboardData | null = null;
  if (siteConfig.leaderboard_api_url) {
    data = await fetchLeaderboard(siteConfig.leaderboard_api_url);
  }

  const showPersonal = siteConfig.leaderboard_personal_rank_visible;

  return (
    <div className="py-8 flex flex-col gap-8">
      <SeriesNav />

      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink">리더보드</h1>
        <p className="text-ink/50 text-sm">시즌 포인트 순위</p>
      </section>

      {!data ? (
        <div className="bg-glass border border-border rounded-card p-6 text-center">
          <p className="text-ink/50 text-sm">준비중</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {/* 개인순위 */}
          {showPersonal && data.personal && data.personal.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gold">개인순위</h2>
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm text-ink/80 border-collapse">
                  <thead>
                    <tr className="bg-ink/5 text-ink/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">순위</th>
                      <th className="px-4 py-3 text-left">이름</th>
                      <th className="px-4 py-3 text-right">포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.personal.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="border-t border-border hover:bg-ink/5 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {isTop3(entry.rank) ? (
                            <span className="text-gold font-bold">{entry.rank}</span>
                          ) : (
                            entry.rank
                          )}
                        </td>
                        <td className="px-4 py-3">{entry.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gold">
                          {entry.point}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* 대학순위 */}
          {data.university && data.university.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gold">대학순위</h2>
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm text-ink/80 border-collapse">
                  <thead>
                    <tr className="bg-ink/5 text-ink/40 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">순위</th>
                      <th className="px-4 py-3 text-left">학교</th>
                      <th className="px-4 py-3 text-right">포인트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.university.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="border-t border-border hover:bg-ink/5 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {isTop3(entry.rank) ? (
                            <span className="text-gold font-bold">{entry.rank}</span>
                          ) : (
                            entry.rank
                          )}
                        </td>
                        <td className="px-4 py-3">{entry.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gold">
                          {entry.point}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* No data at all */}
          {((!showPersonal || !data.personal || data.personal.length === 0) &&
            (!data.university || data.university.length === 0)) && (
              <div className="bg-glass border border-border rounded-card p-6 text-center">
                <p className="text-ink/50 text-sm">준비중</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
