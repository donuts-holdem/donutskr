import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { getSiteConfig } from "@/lib/site/data/siteConfig";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DO:NUTS | 포커, 그 이상의 커뮤니티",
  description: "토너먼트부터 소셜 게임까지, 매주 새로운 판이 열리는 도너츠 포커 클럽.",
};

export default async function HomePage() {
  const config = await getSiteConfig().catch(() => null);
  const signupLink =
    config?.signup_visible && !config.signup_closed ? config.signup_link : null;

  return (
    <section
      aria-labelledby="home-heading"
      className="relative ml-full-bleed flex min-h-home-hero w-screen touch-manipulation flex-col justify-center overflow-hidden font-editorial text-ink sm:min-h-home-hero-wide"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-bg/70" />
        <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-bg to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-bg to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-9 py-10 text-center sm:gap-11 sm:py-16 lg:max-w-3xl">
          <div className="flex flex-col items-center gap-6 sm:gap-7">
            <h1
              id="home-heading"
              className="text-pretty text-hero font-extrabold leading-none tracking-headline"
            >
              포커, 그 이상의
              <br />
              커뮤니티.
            </h1>
            <span
              className={`${display.className} text-3xl font-bold tracking-wordmark text-gold sm:text-5xl`}
            >
              DO:<span className="text-pink">NUTS</span> Poker Club
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/schedule"
              className={`${display.className} group inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-sm font-bold uppercase tracking-action text-bg transition hover:-translate-y-0.5 hover:bg-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
            >
              전체 일정 보기
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </Link>
            {signupLink && (
              <a
                href={signupLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${display.className} inline-flex items-center rounded-pill border border-ink/15 px-5 py-3 text-sm font-bold uppercase tracking-action text-ink/80 transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:border-gold active:text-gold motion-reduce:transition-none`}
              >
                가입 신청
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
