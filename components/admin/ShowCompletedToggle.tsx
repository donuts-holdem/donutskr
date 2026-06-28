"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Toggles the `completed` URL param while preserving any other filters
// (e.g. season). Completed events are hidden by default.
export function ShowCompletedToggle({ checked }: { checked: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggle(next: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("completed", "1");
    else params.delete("completed");
    const qs = params.toString();
    router.push(qs ? `/admin/events?${qs}` : "/admin/events");
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="show-completed"
        checked={checked}
        onCheckedChange={(v) => toggle(v === true)}
      />
      <Label htmlFor="show-completed" className="cursor-pointer">
        완료된 이벤트 보기
      </Label>
    </div>
  );
}
