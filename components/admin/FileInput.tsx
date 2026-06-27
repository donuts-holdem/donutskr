"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface FileInputProps {
  /** id for the underlying input, so an external <Label htmlFor> still associates. */
  id?: string;
  /** Form field name. Omit for client-only upload flows that use onFileSelected. */
  name?: string;
  accept?: string;
  /** Button text. */
  label?: string;
  /** Show the chosen file's name next to the button (default true). */
  showFileName?: boolean;
  /** Called with the picked file (for immediate client-side uploads). */
  onFileSelected?: (file: File) => void;
}

// Styled file picker: a real button triggers the hidden native input, so it
// matches the rest of the admin UI instead of the browser's default
// "파일 선택 / 선택된 파일 없음" control.
export function FileInput({
  id,
  name,
  accept = "image/*",
  label = "이미지 선택",
  showFileName = true,
  onFileSelected,
}: FileInputProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
        {label}
      </Button>
      <input
        ref={ref}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          if (file) onFileSelected?.(file);
        }}
      />
      {showFileName && fileName && (
        <span className="text-muted-foreground max-w-[16rem] truncate text-sm" title={fileName}>
          {fileName}
        </span>
      )}
    </div>
  );
}
