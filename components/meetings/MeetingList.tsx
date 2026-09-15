import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { applicationLabels,type MeetingSummary } from "@/lib/meetings/types";

const date=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit"});
const time=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false});
export function MeetingList({meetings}:{meetings:MeetingSummary[]}) {
  if(!meetings.length)return <p className="border-y border-border py-8 text-sm text-ink/60">예정된 모임이 없습니다.</p>;
  return <ul className="divide-y divide-border">{meetings.map(meeting=>{
    const application=meeting.application;
    const own=application&&["CONFIRMED","WAITLIST","OFFERED"].includes(application.status)?applicationLabels[application.status]:null;
    const state=own??(meeting.status!=="OPEN"?(meeting.status==="COMPLETED"?"완료":"취소"):!meeting.signup_open?"신청 마감":meeting.capacity&&meeting.confirmed+meeting.reserved>=meeting.capacity?"대기 신청":"참가 신청");
    return <li key={meeting.id}><Link href={`/meetings/${meeting.id}`} className={`group grid grid-cols-5 gap-4 py-6 focus-visible:outline-2 focus-visible:outline-gold sm:gap-6 ${meeting.hot?"border-l-2 border-gold pl-4":""}`}>
      <time dateTime={meeting.scheduled_at} className="font-mono text-sm text-ink/70"><span className="block whitespace-nowrap font-semibold text-ink">{date.format(new Date(meeting.scheduled_at)).replace(/\s/g, "").replace(/\.$/, "")}</span><span className="mt-2 block text-xs">{time.format(new Date(meeting.scheduled_at))}</span></time>
      <div className="col-span-4 min-w-0"><div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/60">{meeting.hot&&<span className="font-semibold text-gold">HOT</span>}<span>{meeting.club_name}</span><span>{meeting.club_id===null||meeting.guest_allowed?"오픈 모임":"클럽 모임"}</span></div>
        <h3 className="mt-2 break-words text-lg font-semibold group-hover:text-gold">{meeting.title}</h3><p className="mt-2 text-sm text-ink/60">{meeting.place}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs"><span className="text-ink/60">{meeting.confirmed}{meeting.capacity?` / ${meeting.capacity}명`:'명 참여'}{meeting.reserved>0?` · ${meeting.reserved}명 확정 대기`:""}{meeting.waiting>0?` · 대기 ${meeting.waiting}명`:""}</span><span className="inline-flex items-center gap-2 font-semibold text-gold">{state}<ArrowUpRight className="size-4" aria-hidden="true"/></span></div>
      </div></Link></li>;
  })}</ul>;
}
