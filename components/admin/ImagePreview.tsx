// Admin-only thumbnail preview for a stored image URL. Uses a plain <img> on
// purpose: a back-office preview doesn't need next/image optimization. The raw
// URL is intentionally not shown — the thumbnail is enough.
export function ImagePreview({ src }: { src: string | null | undefined }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail preview, no optimization needed
    <img
      src={src}
      alt="현재 이미지 미리보기"
      className="border-border h-16 w-16 shrink-0 rounded-md border object-cover"
    />
  );
}
