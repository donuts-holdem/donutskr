import type { Metadata } from "next";
import Link from "next/link";
import { getHotPrograms, getPrograms } from "@/lib/data/programs";
import { ProgramCard } from "@/components/program/ProgramCard";

export const metadata: Metadata = {
  title: "DO:NUTS — 프로그램 디렉토리",
  description: "DO:NUTS 포커 클럽 프로그램 모음",
};

const TOP_N = 6;

export default async function HomePage() {
  const [hotPrograms, allPrograms] = await Promise.all([
    getHotPrograms(),
    getPrograms(),
  ]);

  const topPrograms = allPrograms.slice(0, TOP_N);

  return (
    <div className="py-8 flex flex-col gap-12">
      {/* Hero */}
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-ink tracking-tight">
          DO:NUTS
        </h1>
        <p className="text-ink/50 text-sm">
          포커부터 소셜 클럽까지 — 다양한 프로그램을 만나보세요.
        </p>
      </section>

      {/* HOT 프로그램 */}
      {hotPrograms.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <h2 className="text-lg font-bold text-ink">HOT 프로그램</h2>
          </div>
          <div className="flex flex-col gap-3">
            {hotPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      {/* 모든 프로그램 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h2 className="text-lg font-bold text-ink">모든 프로그램</h2>
          </div>
          <Link
            href="/programs"
            className="text-xs text-gold hover:text-gold/70 transition-colors"
          >
            전체 보기 →
          </Link>
        </div>

        {topPrograms.length === 0 ? (
          <p className="text-ink/40 text-sm py-8 text-center">
            등록된 프로그램이 없습니다.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {topPrograms.map((p) => (
                <ProgramCard key={p.id} program={p} />
              ))}
            </div>

            {allPrograms.length > TOP_N && (
              <Link
                href="/programs"
                className="mt-2 block w-full py-3 rounded-pill border border-border text-center text-sm text-ink/60 hover:border-gold/30 hover:text-ink transition-colors"
              >
                {allPrograms.length - TOP_N}개 프로그램 더 보기
              </Link>
            )}
          </>
        )}
      </section>

    </div>
  );
}
