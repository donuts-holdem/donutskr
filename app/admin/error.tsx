"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" role="alert">
      <h2 className="text-foreground text-xl font-bold">문제가 발생했어요</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        저장 중 오류가 생겨 변경사항이 적용되지 않았습니다. 입력값을 확인하고 다시 시도해 주세요. 문제가 계속되면
        개발자에게 문의해 주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
