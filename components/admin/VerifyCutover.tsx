"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { setProgramVerified } from "@/app/admin/actions/programs";

interface Props {
  id: string;
  verified: boolean;
}

export function VerifyCutover({ id, verified }: Props) {
  const [checked, setChecked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleVerify = () => {
    startTransition(async () => {
      await setProgramVerified(id, true);
    });
  };

  const handleRevert = () => {
    startTransition(async () => {
      await setProgramVerified(id, false);
    });
  };

  if (verified) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default" className="h-6 px-3 text-xs">
          블록으로 노출 중
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevert}
          disabled={isPending}
        >
          기존 방식으로 되돌리기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          id="verify-reviewed"
          checked={checked}
          onCheckedChange={(val) => setChecked(val === true)}
        />
        <span className="text-sm text-muted-foreground">검토했습니다</span>
      </label>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            disabled={!checked || isPending}
          >
            검증 완료 — 블록으로 전환
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>블록 렌더러로 전환</AlertDialogTitle>
            <AlertDialogDescription>
              이 프로그램의 공개 페이지가 블록 렌더러로 전환됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify} disabled={isPending}>
              전환
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
