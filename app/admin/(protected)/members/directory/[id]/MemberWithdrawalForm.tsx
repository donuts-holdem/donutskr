"use client";

import { withdrawMember } from "@/app/admin/actions/member-profile";
import { ActionForm } from "@/components/membership/ActionForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function MemberWithdrawalForm({ memberId, retry = false }: { memberId: string; retry?: boolean }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild><Button variant="outline" className="min-h-11 text-coral-to">{retry ? "개인정보 정리 재시도" : "회원 탈퇴"}</Button></AlertDialogTrigger>
    <AlertDialogContent className="max-h-dvh overflow-y-auto">
      <AlertDialogHeader>
        <AlertDialogTitle>{retry ? "개인정보 정리를 완료할까요?" : "회원을 탈퇴 처리할까요?"}</AlertDialogTitle>
        <AlertDialogDescription>개인정보를 삭제하고 로그인·소속·리더 권한을 종료합니다. 출석·XP·모임 이력은 익명으로 보존되며, 탈퇴는 되돌릴 수 없습니다.</AlertDialogDescription>
      </AlertDialogHeader>
      <ActionForm action={withdrawMember} label={retry ? "정리 재시도" : "탈퇴 처리"} pendingLabel="정리 중...">
        <input type="hidden" name="user_id" value={memberId} />
        <div className="space-y-2"><Label htmlFor="withdrawal-reason">처리 사유</Label><Textarea id="withdrawal-reason" name="reason" required maxLength={500} /></div>
        <div className="flex items-start gap-3"><Checkbox id="withdrawal-confirm" name="confirm" required /><Label htmlFor="withdrawal-confirm" className="leading-relaxed">삭제할 정보와 복구할 수 없음을 확인했습니다.</Label></div>
        <AlertDialogCancel className="w-full">취소</AlertDialogCancel>
      </ActionForm>
    </AlertDialogContent>
  </AlertDialog>;
}
