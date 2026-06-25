import { getSiteConfig } from "@/lib/data/siteConfig";

export async function Footer() {
  const config = await getSiteConfig();
  const sponsors = config.footer_sponsors ?? [];

  return (
    <footer className="bg-bg border-t border-border mt-auto">
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col items-center gap-4">
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
