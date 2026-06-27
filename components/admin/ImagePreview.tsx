// Admin-only thumbnail preview for a stored image URL. Uses a plain <img> on
// purpose: the source is an arbitrary external URL (e.g. framerusercontent.com)
// and next/image would require per-host remotePatterns config for a back-office
// preview that doesn't need optimization.
export function ImagePreview({ src }: { src: string | null | undefined }) {
  if (!src) return null;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary external URLs */}
      <img
        src={src}
        alt="현재 이미지 미리보기"
        className="border-border h-16 w-16 shrink-0 rounded-md border object-cover"
      />
      <p className="text-muted-foreground text-xs break-all">{src}</p>
    </div>
  );
}
