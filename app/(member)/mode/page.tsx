import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen, UserRound, UsersRound } from "lucide-react";
import { getLeaderAssignments, requireActiveMember } from "@/lib/membership/server";

export const metadata = { title: "모드 선택 | DO:NUTS CLASS" };

export default async function ModePage() {
  const { supabase, user, isAdmin } = await requireActiveMember();
  const { classIds, clubIds } = await getLeaderAssignments(supabase, user.id);
  if (!isAdmin && !classIds.length && !clubIds.length) redirect("/home");
  const modes = [
    { href:"/home", label:"회원", detail:"MY MEMBERSHIP", icon:UserRound },
    ...(isAdmin ? [{ href:"/admin", label:"관리자", detail:"ADMIN", icon:UsersRound }] : []),
    ...(classIds.length ? [{ href:"/leader?view=class", label:"클래스 운영", detail:`CLASS · ${classIds.length}`, icon:BookOpen }] : []),
    ...(clubIds.length ? [{ href:"/leader?view=club", label:"클럽 운영", detail:`CLUB · ${clubIds.length}`, icon:UsersRound }] : []),
  ];
  return <div className="mx-auto max-w-2xl">
    <header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">DO:NUTS CLASS</p><h1 className="mt-4 text-3xl font-semibold sm:text-4xl">모드 선택</h1></header>
    <ul className="mt-8 space-y-4">{modes.map(({ href, label, detail, icon:Icon }) => <li key={href}>
      <Link href={href} className="group flex items-center gap-5 rounded-card border border-border bg-surface p-6 transition-colors hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold active:bg-surface-hover">
        <Icon className="size-6 text-gold" aria-hidden="true"/><div className="flex-1"><p className="text-xs tracking-widest text-ink/60">{detail}</p><h2 className="mt-2 text-xl font-semibold">{label}</h2></div><ArrowUpRight className="size-5 text-gold" aria-hidden="true"/>
      </Link>
    </li>)}</ul>
  </div>;
}
