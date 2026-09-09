import type { Metadata } from "next";
import { Header } from "@/components/site/Header";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-bg font-editorial text-ink">
      <Header />
      <main id="main-content" tabIndex={-1} className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-20">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold tracking-widest text-gold">DO:NUTS CLASS / MEMBERSHIP</p>
          <p className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">같이 배우고,<br />더 깊이 즐기는 포커.</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink/60">클래스에서 시작한 인연을 동아리와 모임으로 이어갑니다. 도너츠의 다음 판에 함께하세요.</p>
          <div className="mt-8 hidden h-px w-20 bg-gold lg:block" />
        </aside>
        <div className="min-w-0 border-t border-border pt-8 lg:border-t-0 lg:pt-0">{children}</div>
      </main>
    </div>
  );
}
