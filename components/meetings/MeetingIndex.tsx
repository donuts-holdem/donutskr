import Link from "next/link";
import { getMeetingIndex } from "@/lib/meetings/server";
import { MeetingEditor } from "@/components/meetings/MeetingEditor";
import { MeetingList } from "@/components/meetings/MeetingList";

export async function MeetingIndex({manage=false,clubId}:{manage?:boolean;clubId?:string}) {
 const data=await getMeetingIndex(manage,clubId);
 return <div className="space-y-8"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6"><h1 className="text-3xl font-semibold">{manage?"모임 운영":"모임"}</h1>{!manage&&(data.isAdmin||data.clubs.length>0)&&<Link href={data.isAdmin?"/admin/meetings":"/leader/meetings"} className="inline-flex min-h-11 items-center text-sm text-gold underline focus-visible:outline-2 focus-visible:outline-gold">모임 운영</Link>}</header>
  {clubId&&<Link href="/meetings" className="inline-flex min-h-11 items-center text-sm text-gold underline">전체 모임</Link>}
  <section aria-label="모임 목록"><h2 className="sr-only">모임 목록</h2><MeetingList meetings={data.meetings}/></section>
  {manage&&(data.isAdmin||data.clubs.length>0)&&<section className="max-w-2xl border-t border-border pt-8"><h2 className="mb-6 text-xl font-semibold">새 모임</h2><MeetingEditor clubs={data.clubs} isAdmin={data.isAdmin}/></section>}
 </div>;
}
