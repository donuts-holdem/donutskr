"use client";

import { startTransition, useActionState, useState } from "react";
import { savePartner, deletePartner } from "@/app/admin/actions/partners";
import { ActionForm } from "@/components/membership/ActionForm";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Partner } from "@/lib/partners/types";

function DeletePartner({ partner }: { partner: Partner }) {
  const [state, remove, pending] = useActionState(deletePartner, {});
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button variant="outline" className="text-coral-to">파트너 삭제</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>파트너를 삭제할까요?</AlertDialogTitle>
        <AlertDialogDescription>{partner.name}이(가) 회원 목록에서 삭제됩니다.</AlertDialogDescription>
      </AlertDialogHeader>
      <form action={remove} onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => remove(form));
      }} aria-busy={pending}>
        <input type="hidden" name="id" value={partner.id} />
        <input type="hidden" name="revision" value={partner.revision} />
        <input type="hidden" name="confirm" value="on" />
        {state.error && <p role="alert" className="mb-4 text-sm text-coral-to">{state.error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <Button type="submit" variant="destructive" disabled={pending}>{pending ? "삭제 중..." : "삭제"}</Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}

export function PartnerEditor({ partner }: { partner?: Partner }) {
  const [uploading, setUploading] = useState(false);
  return <div className="space-y-8">
    <ActionForm action={savePartner} label={partner ? "변경 저장" : "파트너 등록"} pendingLabel="저장 중..." disabled={uploading}>
      {partner && <><input type="hidden" name="id" value={partner.id} /><input type="hidden" name="revision" value={partner.revision} /></>}
      <div className="space-y-2"><Label htmlFor="partner-name">이름</Label><Input id="partner-name" name="name" required maxLength={120} defaultValue={partner?.name ?? ""} className="min-h-11" /></div>
      <div className="space-y-2"><Label htmlFor="partner-description">소개</Label><Textarea id="partner-description" name="description" maxLength={4000} rows={4} defaultValue={partner?.description ?? ""} /></div>
      <div className="space-y-2"><Label htmlFor="partner-url">링크</Label><Input id="partner-url" name="url" type="url" required maxLength={2048} autoCapitalize="none" defaultValue={partner?.url ?? ""} placeholder="https://" className="min-h-11" /></div>
      <ImageUploadField id="partner-logo" name="logo_url" initialUrl={partner?.logo_url} onUploadingChange={setUploading} />
    </ActionForm>
    {partner && <div className="border-t border-border pt-6"><DeletePartner partner={partner} /></div>}
  </div>;
}
