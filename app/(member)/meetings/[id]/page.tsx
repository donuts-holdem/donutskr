import { MeetingDetail } from "@/components/meetings/MeetingDetail";
export const metadata = { title: "클럽 모임 | DO:NUTS CLASS" };
export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  return <MeetingDetail id={(await params).id} />;
}
