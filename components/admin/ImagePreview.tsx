import { cn } from "@/lib/utils";

// Admin-only thumbnail preview for a stored image URL. Uses a plain <img> on
// purpose: a back-office preview doesn't need next/image optimization. The raw
// URL is intentionally not shown — the thumbnail is enough. Pass `className` to
// override the default size (e.g. a larger cover preview).
export function ImagePreview({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail preview, no optimization needed
    <img
      src={src}
      alt="현재 이미지 미리보기"
      className={cn("border-border shrink-0 rounded-md border object-cover", className ?? "h-24 w-24")}
    />
  );
}
