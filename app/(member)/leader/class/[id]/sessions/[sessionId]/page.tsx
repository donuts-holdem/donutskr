import { SessionBoard } from "@/components/classes/SessionBoard";

export const metadata = { title: "회차 · 출석 운영 | DO:NUTS CLASS" };
export default async function LeaderSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  return <SessionBoard classId={id} sessionId={sessionId} basePath="/leader/class" />;
}
