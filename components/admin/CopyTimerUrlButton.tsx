"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copies the public display URL (`{origin}/timer/{id}`) to the clipboard. The
 * origin is read at click time so the copied link matches whatever host the
 * operator is on (localhost, preview, or prod).
 */
export function CopyTimerUrlButton({
  id,
  label = "URL 복사",
  size = "sm",
}: {
  id: string;
  label?: string;
  size?: "sm" | "xs" | "default";
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const url = `${window.location.origin}/timer/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("디스플레이 URL이 복사되었습니다");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사에 실패했습니다");
    }
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={onCopy}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {label}
    </Button>
  );
}
