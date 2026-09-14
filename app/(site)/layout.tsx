import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Suspense } from "react";

// Public landing and footer share the member-service navigation.
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
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
