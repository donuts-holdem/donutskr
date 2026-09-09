"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OperationsError({ reset }: { reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl space-y-5 py-12"><h1 className="text-2xl font-semibold">운영 정보를 불러오지 못했습니다.</h1><p className="text-sm leading-relaxed text-muted-foreground">다시 시도해 주세요. 계속 문제가 발생하면 운영 DB의 클래스·클럽 마이그레이션 적용 상태와 계정 권한을 확인해야 합니다.</p><div className="flex flex-wrap gap-3"><Button onClick={reset} className="h-11">다시 시도</Button><Button asChild variant="outline" className="h-11"><Link href="/admin/members">회원 관리로</Link></Button></div></section>;
}
