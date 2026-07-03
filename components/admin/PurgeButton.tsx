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

interface PurgeButtonProps {
  action: (fd: FormData) => void | Promise<void>;
  entity: string;
  id: string;
  itemName?: string;
}

/**
 * Permanent-delete control for the trash page. Unlike DeleteButton (which
 * soft-deletes), this hard-deletes a row, so it carries a stronger,
 * non-recoverable confirmation.
 */
export function PurgeButton({ action, entity, id, itemName }: PurgeButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm">
            완전 삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>완전 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemName ? `"${itemName}"은(는) ` : ""}영구 삭제되며 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
              완전 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
