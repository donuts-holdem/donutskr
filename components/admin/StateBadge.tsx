import { Eye, EyeOff, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Kind = "visible" | "expired";

const CONFIG: Record<Kind, {
  onText: string; offText: string; onAria: string; offAria: string;
  OnIcon: typeof Eye; OffIcon: typeof Eye;
}> = {
  visible: { onText: "노출", offText: "비노출", onAria: "노출 중", offAria: "노출 안 함", OnIcon: Eye, OffIcon: EyeOff },
  expired: { onText: "종료됨", offText: "진행중", onAria: "종료일 지남 (공개 사이트 미노출)", offAria: "진행 중", OnIcon: CalendarX, OffIcon: CalendarX },
};

export function StateBadge({ on, kind }: { on: boolean; kind: Kind }) {
  const c = CONFIG[kind];
  const Icon = on ? c.OnIcon : c.OffIcon;
  return (
    <Badge
      variant="outline"
      aria-label={on ? c.onAria : c.offAria}
      className={
        on
          ? "border-border bg-primary/10 text-primary gap-1 [&_svg]:size-3"
          : "border-border text-muted-foreground/70 gap-1 [&_svg]:size-3"
      }
    >
      <Icon aria-hidden />
      {on ? c.onText : c.offText}
    </Badge>
  );
}
