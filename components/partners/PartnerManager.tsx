"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderPartners } from "@/app/admin/actions/partners";
import { movePartnerOrder, orderedPartners } from "@/lib/partners/validation";
import type { Partner } from "@/lib/partners/types";

export function PartnerManager({ partners }: { partners: Partner[] }) {
  const [state, reorder, pending] = useActionState(reorderPartners, {});
  const ordered = orderedPartners(partners);
  function move(id: string, direction: "up" | "down") {
    const form = new FormData();
    form.set("order", JSON.stringify(movePartnerOrder(partners, id, direction)));
    startTransition(() => reorder(form));
  }

  if (!ordered.length) return <p className="rounded-card border border-border px-6 py-8 text-sm text-muted-foreground">등록된 파트너가 없습니다.</p>;
  return <div className="space-y-4" aria-busy={pending}>
    {state.error && <p role="alert" className="text-sm text-coral-to">{state.error}</p>}
    {state.success && <p role="status" className="text-sm text-gold">{state.success}</p>}
    <ol className="space-y-3">
      {ordered.map((partner, index) => <li key={partner.id} className="flex min-w-0 items-center gap-3 rounded-card border border-border bg-card p-4 sm:gap-5 sm:p-5">
        <Link href={`/admin/partners/${partner.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
          {partner.logo_url && <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border p-2 sm:size-16">
            {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded partner logo thumbnail. */}
            <img src={partner.logo_url} alt="" className="max-h-full max-w-full object-contain" />
          </div>}
          <div className="min-w-0 flex-1 py-2">
            <p className="break-words font-semibold">{partner.name}</p>
            {partner.description && <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{partner.description}</p>}
          </div>
          <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-gold" />
          <span className="sr-only">수정</span>
        </Link>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button type="button" variant="outline" size="icon" className="size-11" disabled={pending || index === 0}
            aria-label={`${partner.name} 위로 이동`} onClick={() => move(partner.id, "up")}><ArrowUp aria-hidden="true" /></Button>
          <Button type="button" variant="outline" size="icon" className="size-11" disabled={pending || index === ordered.length - 1}
            aria-label={`${partner.name} 아래로 이동`} onClick={() => move(partner.id, "down")}><ArrowDown aria-hidden="true" /></Button>
        </div>
      </li>)}
    </ol>
  </div>;
}
