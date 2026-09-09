import Link from "next/link";
import { Bell } from "lucide-react";
import { getMembershipSession } from "@/lib/membership/server";

const accountClassName = "inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border border-gold/30 px-4 text-sm font-semibold text-gold transition-colors hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export function HeaderAccountFallback() {
  return <Link href="/login" className={accountClassName}>로그인</Link>;
}

export async function HeaderAccount() {
  // An unavailable membership service must not take public schedules offline.
  const session = await getMembershipSession().catch(() => null);
  if (!session?.user) return <HeaderAccountFallback />;

  const active = session.isAdmin || (
    session.profile?.status === "ACTIVE" && Boolean(session.user.email_confirmed_at)
  );
  const href = session.isAdmin ? "/admin" : active ? "/my" : session.profile ? "/membership/status" : "/signup";
  const label = session.isAdmin ? "운영 관리" : active ? "MY" : session.profile ? "회원 상태" : "가입 계속";

  return <div className="flex shrink-0 items-center gap-2">
    {active && <Link href="/notifications" aria-label="알림" className="hidden size-11 items-center justify-center rounded-pill text-ink/70 transition-colors hover:bg-gold/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:inline-flex"><Bell className="size-5" aria-hidden="true" /></Link>}
    <Link href={href} className={accountClassName}>{label}</Link>
  </div>;
}
