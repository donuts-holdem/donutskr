"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileInput } from "@/components/admin/FileInput";

interface ImageFieldProps {
  /** Base field name: the file is submitted as `${name}_file`, the existing
   *  value as `${name}_existing` (matching the server actions). */
  name: string;
  /** Currently-saved image URL (undefined/null on a new record). */
  existing?: string | null;
  /** File-picker button label. */
  label?: string;
  /** Preview/placeholder size override (default h-24 w-24). */
  className?: string;
}

// Admin image input with a live preview: shows the just-picked file immediately
// (the upload itself still happens on form submit), falling back to the saved
// image, then a placeholder box when empty. Pairs the styled FileInput with the
// hidden `${name}_existing` value the update actions read.
export function ImageField({ name, existing, label = "이미지 선택", className }: ImageFieldProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? existing ?? null;
  const box = className ?? "h-24 w-24";

  return (
    <>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview, no optimization needed
        <img
          src={shown}
          alt="이미지 미리보기"
          className={cn("border-border shrink-0 rounded-md border object-cover", box)}
        />
      ) : (
        <div
          className={cn(
            "border-border text-muted-foreground flex shrink-0 items-center justify-center rounded-md border border-dashed text-xs",
            box,
          )}
        >
          이미지 없음
        </div>
      )}
      <input type="hidden" name={`${name}_existing`} value={existing ?? ""} />
      <FileInput
        id={`${name}_file`}
        name={`${name}_file`}
        label={label}
        showFileName={false}
        onFileSelected={(file) =>
          setPreview((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
          })
        }
      />
    </>
  );
}
