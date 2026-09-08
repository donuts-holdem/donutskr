"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
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

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
  itemName?: string;
}

export function DeleteButton({ onDelete, itemName }: DeleteButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={onDelete} ref={formRef}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemName ? `"${itemName}"을(를) ` : ""}삭제하면 공개 사이트에서 숨겨지고 휴지통으로 이동합니다. 휴지통에서 복구할 수 있으며 자동으로 영구 삭제되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
