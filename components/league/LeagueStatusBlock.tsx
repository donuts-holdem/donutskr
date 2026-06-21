import type { OnlineLeague } from "@/lib/types";

interface Props {
  league: OnlineLeague;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-glass border border-border rounded-card p-6 flex flex-col gap-3">
      {children}
    </div>
  );
}

export function LeagueStatusBlock({ league }: Props) {
  if (league.status === "hidden") return null;

  if (league.status === "operating") {
    return (
      <div className="flex flex-col gap-6">
        {/* Title / date info */}
        <div className="flex flex-col gap-2">
          {league.title && (
            <h2 className="text-2xl font-bold text-gold">{league.title}</h2>
          )}
          {league.description && (
            <p className="text-ink/70 text-sm leading-relaxed">{league.description}</p>
          )}
        </div>

        {/* Today's leagues */}
        {league.today_leagues.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-widest">
              오늘의 리그
            </h3>
            <div className="flex flex-col gap-2">
              {league.today_leagues.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-glass border border-border rounded-card px-4 py-3 gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-ink text-sm">{item.name}</span>
                    {item.time && (
                      <span className="text-xs text-ink/50">{item.time}</span>
                    )}
                    {item.reg_close && (
                      <span className="text-xs text-ink/40">참가 마감: {item.reg_close}</span>
                    )}
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-1.5 rounded-pill bg-coral-cta text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      참가링크
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join guide / steps */}
        {league.join_guide && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-widest">
              참가 안내
            </h3>
            <p className="text-ink/70 text-sm leading-relaxed">{league.join_guide}</p>
          </div>
        )}

        {league.steps.length > 0 && (
          <ol className="flex flex-col gap-2 list-none pl-0">
            {league.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink/70">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gold/15 text-gold text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Notice */}
        {league.notice_text && (
          <div className="bg-gold/5 border border-gold/20 rounded-card px-4 py-3 text-sm text-ink/70">
            {league.notice_text}
          </div>
        )}

        {/* CTA button */}
        {league.cta_url && (
          <a
            href={league.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 rounded-pill bg-coral-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {league.cta_label ?? "참가 신청하기"}
          </a>
        )}

        {/* Additional links */}
        {Object.keys(league.links).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(league.links).map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-1.5 rounded-pill border border-border text-sm text-ink/60 hover:text-gold hover:border-gold/40 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Sheet URL */}
        {league.sheet_url && (
          <a
            href={league.sheet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink/50 hover:text-gold underline underline-offset-2 transition-colors"
          >
            전체 일정 보기
          </a>
        )}
      </div>
    );
  }

  // revamping | preparing | suspended — show info box
  const messages: Record<string, string> = {
    revamping: league.notice_text ?? "온라인 리그가 개편 중입니다. 곧 새로운 모습으로 찾아뵙겠습니다.",
    preparing: league.notice_text ?? "온라인 리그를 준비 중입니다. 조금만 기다려 주세요.",
    suspended: league.notice_text ?? "온라인 리그가 잠시 중단되었습니다. 공지사항을 확인해 주세요.",
  };

  const titles: Record<string, string> = {
    revamping: "리그 개편 중",
    preparing: "리그 준비 중",
    suspended: "리그 일시 중단",
  };

  const message = messages[league.status] ?? league.notice_text ?? "현재 온라인 리그를 이용하실 수 없습니다.";
  const title = titles[league.status] ?? "안내";

  return (
    <InfoBox>
      <h3 className="font-semibold text-gold">{title}</h3>
      <p className="text-ink/70 text-sm leading-relaxed">{message}</p>
      {league.description && league.description !== message && (
        <p className="text-ink/50 text-sm leading-relaxed">{league.description}</p>
      )}
    </InfoBox>
  );
}
