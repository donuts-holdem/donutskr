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
              {sponsors.map((s, i) =>
                s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={s.logo}
                    alt={s.name}
                    className="h-8 object-contain opacity-70"
                  />
                ) : (
                  <span key={i} className="text-sm text-ink/60">
                    {s.name}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-ink/40">© Donuts Poker Club</p>
      </div>
    </footer>
  );
}
