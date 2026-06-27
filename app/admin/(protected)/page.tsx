import Link from "next/link";
import { LayoutList, Target, FileText, CalendarRange, Layers, Radio, Settings, ExternalLink } from "lucide-react";
import { getAllPrograms } from "@/lib/data/programs";
import { getAllEvents, getEvents } from "@/lib/data/events";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { getAllSeasons, getActiveSeason } from "@/lib/data/seasons";
import { getAllStructures } from "@/lib/data/blindStructures";
import { partitionEvents, todayKST } from "@/lib/schedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const [programs, allEvents, specialPages, seasons, structures, activeSeason, publicEvents] =
    await Promise.all([
      getAllPrograms(), getAllEvents(), getAllSpecialPages(),
      getAllSeasons(), getAllStructures(), getActiveSeason(), getEvents(),
    ]);
  const upcoming = partitionEvents(publicEvents, todayKST()).upcoming.slice(0, 4);

  const GROUPS = [
    { label: "콘텐츠", cards: [
      { href: "/admin/programs", Icon: LayoutList, title: "프로그램", count: programs.length, unit: "개", desc: "프로그램·요금·HOT 관리" },
      { href: "/admin/events", Icon: Target, title: "이벤트", count: allEvents.length, unit: "개", desc: "토너먼트 일정·상태 관리" },
      { href: "/admin/special-pages", Icon: FileText, title: "특수 페이지", count: specialPages.length, unit: "개", desc: "시리즈·랜딩 페이지" },
    ]},
    { label: "구조", cards: [
      { href: "/admin/seasons", Icon: CalendarRange, title: "시즌", count: seasons.length, unit: "개", desc: "시즌 생성·활성화" },
      { href: "/admin/blind-structures", Icon: Layers, title: "블라인드 스트럭처", count: structures.length, unit: "개", desc: "블라인드 템플릿 관리" },
    ]},
    { label: "사이트 설정", cards: [
      { href: "/admin/online-league", Icon: Radio, title: "온라인 리그", count: null, unit: "", desc: "리그 노출·상태" },
      { href: "/admin/settings", Icon: Settings, title: "설정", count: null, unit: "", desc: "사이트 전역 설정" },
    ]},
  ];

  const LIVE_LINKS = [
    { href: "/", label: "홈" }, { href: "/schedule", label: "일정" },
    { href: "/programs", label: "프로그램" }, { href: "/series", label: "시리즈" },
  ];

  return (
    <div>
      <h1 className="text-gold text-2xl font-bold">관리자 대시보드</h1>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-2 py-3">
          <span className={`size-2 rounded-full ${activeSeason ? "bg-primary" : "bg-muted-foreground/40"}`} aria-hidden />
          <span className="sr-only">활성 시즌</span>
          <span className="text-muted-foreground text-sm">현재 활성 시즌</span>
          <span className="text-foreground font-medium">
            {activeSeason ? `${activeSeason.name} (${activeSeason.year})` : "없음"}
          </span>
        </CardContent>
      </Card>

      {GROUPS.map((group) => (
        <section key={group.label}>
          <h2 className="text-muted-foreground mb-3 mt-8 text-xs font-semibold uppercase tracking-wide">{group.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((c) => (
              <Link key={c.href} href={c.href} className="group focus-visible:outline-none">
                <Card className="group-hover:border-primary/40 group-focus-visible:ring-ring/50 transition-colors group-focus-visible:ring-2">
                  <CardContent className="py-5">
                    <c.Icon className="text-muted-foreground group-hover:text-primary size-5" aria-hidden />
                    <p className="text-foreground mt-3 font-semibold">{c.title}</p>
                    <p className="text-primary mt-1 text-sm font-medium">
                      {c.count !== null ? `${c.title} ${c.count}${c.unit}` : "바로가기 →"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{c.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">다가오는 이벤트</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">다가오는 이벤트가 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}/edit`} className="hover:bg-muted/50 flex gap-3 rounded-md px-2 py-1.5">
                      <span className="text-muted-foreground text-sm tabular-nums">{e.date ?? "미정"}</span>
                      <span className="text-foreground text-sm">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">라이브 사이트</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1">
            {LIVE_LINKS.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm" className="justify-start">
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" aria-hidden /> {l.label}
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
