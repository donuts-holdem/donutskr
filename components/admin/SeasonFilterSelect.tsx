"use client";
import { useRouter } from "next/navigation";
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
  return (
    <Select
      value={value}
      onValueChange={(v) =>
        router.push(v === "all" ? "/admin/events" : `/admin/events?season=${v}`)
      }
    >
      <SelectTrigger className="w-56">
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
