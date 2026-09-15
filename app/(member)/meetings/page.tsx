import { MeetingIndex } from "@/components/meetings/MeetingIndex";
export const metadata={title:"모임 | DO:NUTS CLASS"};
export default async function MeetingsPage({searchParams}:{searchParams:Promise<{club?:string}>}) {
 return <MeetingIndex clubId={(await searchParams).club}/>;
}
