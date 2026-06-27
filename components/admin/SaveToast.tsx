"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SaveToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = params.get("saved");
    const deleted = params.get("deleted");
    if (!saved && !deleted) return;
    toast.success(deleted ? "삭제되었습니다" : "저장되었습니다");
    const next = new URLSearchParams(params);
    next.delete("saved");
    next.delete("deleted");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
