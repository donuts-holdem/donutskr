"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { FileInput } from "@/components/admin/FileInput";
import { uploadAdminImage } from "@/lib/upload-client";

type Sponsor = { name: string; logo?: string; url?: string };

// Per-row logo field: uploads the chosen file to our Supabase media bucket and
// stores the returned URL, so footer sponsor logos never depend on an external host.
function LogoField({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    const form = wrapper.current?.closest("form");
    if (!form) return;
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
    inFlight.current = true;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadAdminImage(file);
      onChangeRef.current(url);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error && /[가-힣]/.test(failure.message)
        ? failure.message : "이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setUploading(false);
      const input = wrapper.current?.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = "";
    }
  }

  return (
    <div ref={wrapper} className="flex flex-1 flex-wrap items-center gap-2" aria-busy={uploading}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a stored logo
        <img src={value} alt="로고 미리보기" className="border-border h-10 w-10 shrink-0 rounded border object-contain" />
      ) : (
        <div className="border-border text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded border text-2xs">
          로고
        </div>
      )}
      <fieldset disabled={uploading}><FileInput
        label="로고 선택"
        showFileName={false}
        onFileSelected={(file) => void upload(file)}
      /></fieldset>
      {uploading && <span role="status" className="text-muted-foreground shrink-0 text-xs">업로드중…</span>}
      {error && <span role="alert" className="text-destructive text-xs">{error}</span>}
    </div>
  );
}

export function FooterSponsorsEditor({ initial }: { initial: Sponsor[] }) {
  return (
    <RepeatableFieldEditor<Sponsor>
      name="footer_sponsors"
      initial={initial}
      makeEmpty={() => ({ name: "", logo: "", url: "" })}
      addLabel="스폰서 추가"
      emptyHint="추가된 스폰서가 없습니다."
      renderRow={(row, onChange) => (
        <>
          <Input
            value={row.name}
            onChange={(e) => onChange({ ...row, name: e.target.value })}
            placeholder="스폰서명"
            className="w-40"
          />
          <LogoField value={row.logo} onChange={(logo) => onChange({ ...row, logo })} />
          <Input
            value={row.url ?? ""}
            onChange={(e) => onChange({ ...row, url: e.target.value })}
            placeholder="링크 URL (선택)"
            className="flex-1"
          />
        </>
      )}
    />
  );
}
