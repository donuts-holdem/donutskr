"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MembershipError({ reset }: { reset: () => void }) {
  return <section role="alert" className="space-y-5 rounded-card border border-border bg-surface p-6">
    <h1 className="text-xl font-semibold">회원 서비스에 연결하지 못했습니다.</h1>
    <p className="text-sm leading-relaxed text-ink/70">잠시 후 다시 시도해 주세요. 문제가 계속되면 운영진에게 문의해 주세요.</p>
    <div className="flex flex-wrap gap-3"><Button onClick={reset} className="h-11">다시 시도</Button><Button asChild variant="outline" className="h-11"><Link href="/">공개 사이트로</Link></Button></div>
  </section>;
}
