import Link from "next/link";
import { getActiveSeason } from "@/lib/data/seasons";
import { Card, CardContent } from "@/components/ui/card";

const CARDS = [
  { href: "/admin/seasons", icon: "🗓", title: "시즌 관리", desc: "시즌 생성·수정·활성화" },
  { href: "/admin/events", icon: "🎯", title: "이벤트 관리", desc: "이벤트 생성·수정·삭제" },
];

export default async function AdminPage() {
  const activeSeason = await getActiveSeason();

  return (
    <div>
      <h1 className="text-gold mb-1 text-2xl font-bold">관리자 대시보드</h1>
      {activeSeason ? (
        <p className="text-muted-foreground mb-6 text-sm">
          현재 활성 시즌:{" "}
          <span className="text-foreground">
            {activeSeason.name} ({activeSeason.year})
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground mb-6 text-sm">활성 시즌 없음</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="group">
            <Card className="transition-colors group-hover:border-gold/40">
              <CardContent>
                <div className="mb-2 text-2xl">{c.icon}</div>
                <div className="font-semibold">{c.title}</div>
                <div className="text-muted-foreground mt-1 text-xs">{c.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
