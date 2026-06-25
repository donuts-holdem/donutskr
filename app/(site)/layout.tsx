import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Suspense } from "react";

// Site chrome (header / centered container / footer) for the public marketing
// pages. Routes outside this group (e.g. /lab, /admin) render full-bleed without it.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Suspense fallback={<div className="h-20 bg-bg border-b border-border" />}>
        <Header />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 w-full flex-1">{children}</main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
