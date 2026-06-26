"use client";

import { Button } from "@/components/ui/button";

interface DeleteButtonProps {
  onDelete: () => void | Promise<void>;
}

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <form action={onDelete}>
      <Button type="submit" variant="destructive" size="sm">
        삭제
      </Button>
    </form>
  );
}
