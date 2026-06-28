"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Season } from "@/lib/types";

export function SeasonFilterSelect({
  seasons,
  value,
}: {
  seasons: Season[];
  value: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete("season");
    else params.set("season", v);
    const qs = params.toString();
    router.push(qs ? `/admin/events?${qs}` : "/admin/events");
  }

  return (
    <Select value={value} onValueChange={select}>
      <SelectTrigger className="w-56" aria-label="시즌 필터">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 시즌</SelectItem>
        <SelectItem value="none">미배정 (상시노출)</SelectItem>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
