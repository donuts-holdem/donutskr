import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventVisibility } from "@/lib/legacy/visibility";

type State = EventVisibility;

const CONFIG: Record<State, { text: string; aria: string; className: string; Icon: typeof Eye }> = {
  live: { text: "노출 중", aria: "공개 사이트에 노출 중", className: "border-border bg-primary/10 text-primary", Icon: Eye },
  off: { text: "비노출", aria: "노출 꺼짐", className: "border-border text-muted-foreground/70", Icon: EyeOff },
  "hidden-flag": { text: "노출 안 됨 · 숨김 상태", aria: "노출은 켜졌지만 상태가 숨김이라 공개되지 않음", className: "border-warning/30 bg-warning/15 text-warning", Icon: AlertTriangle },
};

export function EffectiveVisibilityBadge({ state }: { state: State }) {
  const c = CONFIG[state];
  return (
    <Badge variant="outline" aria-label={c.aria} className={`gap-1 [&_svg]:size-3 ${c.className}`}>
      <c.Icon aria-hidden />
      {c.text}
    </Badge>
  );
}
