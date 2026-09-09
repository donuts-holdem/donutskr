import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SeasonBackdrop } from "@/components/site/SeasonBackdrop";
import { getActiveSeason } from "@/lib/site/data/seasons";
import { Suspense } from "react";

// The active season's bg_image, streamed in as a site-wide atmospheric layer.
// Defensive: any fetch failure (or no active season / no image) simply renders
// nothing rather than crashing the public chrome. Kept in its own Suspense
// boundary so the season query never blocks the page's LCP.
async function SeasonBackdropSlot() {
  const season = await getActiveSeason().catch(() => null);
  return <SeasonBackdrop image={season?.bg_image ?? null} />;
}

// Public content retains its backdrop and footer, with shared app navigation.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Suspense fallback={null}>
        <SeasonBackdropSlot />
      </Suspense>
      <Suspense fallback={<div className="h-16 bg-bg border-b border-border" />}>
        <Header />
      </Suspense>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 w-full flex-1 scroll-mt-20">{children}</main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
