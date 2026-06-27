import { getSiteConfig } from "@/lib/data/siteConfig";

// Ensure outbound links carry a scheme; a bare host like "do-lab.co.kr"
// would otherwise resolve as a relative path and navigate within the site.
function normalizeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return undefined;
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function Footer() {
  const config = await getSiteConfig();

  // Official Sponsor = the configured footer sponsors only. Each carries its own
  // uploaded logo (managed in 설정 > 푸터 스폰서), kept separate from program covers.
  const sponsors = (config.footer_sponsors ?? []).map((s) => ({ ...s, url: normalizeUrl(s.url) }));

  return (
    <footer className="bg-bg border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col items-center gap-4">
        {sponsors.length > 0 && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-ink/40 tracking-widest uppercase">
              Official Sponsor
            </p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {sponsors.map((s, i) => {
                const inner = s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logo}
                    alt={s.name}
                    className="max-h-9 max-w-[84px] w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <span className="text-sm text-ink/60">{s.name}</span>
                );
                return s.url && s.url !== "#" ? (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                    {inner}
                  </a>
                ) : (
                  <span key={i}>{inner}</span>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-ink/40">© Donuts Poker Club. All rights reserved.</p>
      </div>
    </footer>
  );
}
