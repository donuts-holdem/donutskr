import { Eye, EyeOff, Flame, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Kind = "visible" | "hot" | "affiliate";

const CONFIG: Record<Kind, {
  onText: string; offText: string; onAria: string; offAria: string;
  OnIcon: typeof Eye; OffIcon: typeof Eye;
}> = {
  visible: { onText: "노출", offText: "비노출", onAria: "노출 중", offAria: "노출 안 함", OnIcon: Eye, OffIcon: EyeOff },
  hot: { onText: "HOT", offText: "HOT", onAria: "HOT 표시 켜짐", offAria: "HOT 표시 꺼짐", OnIcon: Flame, OffIcon: Flame },
  affiliate: { onText: "제휴", offText: "제휴", onAria: "제휴 표시 켜짐", offAria: "제휴 표시 꺼짐", OnIcon: Handshake, OffIcon: Handshake },
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
