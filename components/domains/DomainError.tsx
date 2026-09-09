"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DomainError({ reset }: { reset: () => void }) {
  return <section className="max-w-xl space-y-5 py-10" role="alert"><h1 className="text-2xl font-semibold">내용을 불러오지 못했습니다</h1><p className="text-sm leading-relaxed text-muted-foreground">연결 상태와 접근 권한을 확인해 주세요. 입력·처리 결과가 불확실하면 새로고침하여 현재 기록을 먼저 확인해 주세요.</p>
    <div className="flex flex-wrap items-center gap-5"><Button onClick={reset}>다시 시도</Button><Link href="/home" className="inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">회원 홈</Link></div>
  </section>;
}
