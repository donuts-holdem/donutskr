"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { FileInput } from "@/components/admin/FileInput";

type Sponsor = { name: string; logo?: string; url?: string };

// Per-row logo field: uploads the chosen file to our Supabase media bucket and
// stores the returned URL, so footer sponsor logos never depend on an external host.
function LogoField({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "site_media");
      const res = await fetch("/api/admin/program-image", { method: "POST", body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "이미지 업로드에 실패했습니다.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a stored logo
        <img src={value} alt="로고 미리보기" className="border-border h-10 w-10 shrink-0 rounded border object-contain" />
      ) : (
        <div className="border-border text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded border text-2xs">
          로고
        </div>
      )}
      <FileInput
        label="로고 선택"
        showFileName={false}
        onFileSelected={(file) => void upload(file)}
      />
      {uploading && <span className="text-muted-foreground shrink-0 text-xs">업로드중…</span>}
      {error && <span className="text-destructive shrink-0 text-xs">{error}</span>}
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
