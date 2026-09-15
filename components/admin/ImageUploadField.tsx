"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assertImageUpload } from "@/lib/upload";
import { uploadAdminImage } from "@/lib/upload-client";

export function ImageUploadField({ name, id, label = "로고", initialUrl = null, onUploadingChange }: {
  name: string;
  id?: string;
  label?: string;
  initialUrl?: string | null;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const wrapper = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    const form = wrapper.current?.closest("form");
    if (!form) return;
    // This also protects server-rendered ActionForm consumers which cannot pass
    // client upload state into their parent form's disabled prop.
    const blockPrematureSave = (event: Event) => {
      if (!inFlight.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setError("이미지 업로드가 완료된 뒤 저장해 주세요.");
    };
    form.addEventListener("submit", blockPrematureSave, true);
    return () => form.removeEventListener("submit", blockPrematureSave, true);
  }, []);

  async function upload(file: File) {
    if (inFlight.current) return;
    setError(null);
    try {
      if (!file.size) throw new Error("이미지 파일을 선택해 주세요.");
      assertImageUpload(file);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "이미지 파일을 확인해 주세요.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    inFlight.current = true;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      setUrl(await uploadAdminImage(file));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error && /[가-힣]/.test(failure.message)
        ? failure.message : "이미지를 업로드하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setUploading(false);
      onUploadingChange?.(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return <div ref={wrapper} className="space-y-3" aria-busy={uploading}>
    <Label htmlFor={fieldId}>{label}</Label>
    <input type="hidden" name={name} value={url} />
    {url && <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded logos can retain their original format. */}
      <img src={url} alt={`${label} 미리보기`} className="size-20 rounded-lg border border-border bg-surface object-contain p-2" />
      <Button type="button" variant="outline" disabled={uploading || pending} onClick={() => { setUrl(""); setError(null); }}>{label} 제거</Button>
    </div>}
    <Input ref={fileInput} id={fieldId} type="file" accept="image/*" className="min-h-11 py-2" disabled={uploading || pending}
      aria-describedby={error ? `${fieldId}-error` : undefined}
      onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void upload(file); }} />
    {uploading && <p role="status" className="text-sm text-muted-foreground">업로드 중...</p>}
    {error && <p id={`${fieldId}-error`} role="alert" className="text-sm text-coral-to">{error}</p>}
  </div>;
}
