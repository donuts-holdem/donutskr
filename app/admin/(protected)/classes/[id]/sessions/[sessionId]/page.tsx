import { SessionBoard } from "@/components/classes/SessionBoard";

export const metadata = { title: "회차 · 출석 관리 | DO:NUTS Admin" };
export default async function SessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  return <SessionBoard classId={id} sessionId={sessionId} basePath="/admin/classes" />;
}
