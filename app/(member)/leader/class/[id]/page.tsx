import { ClassManagement } from "@/components/classes/ClassManagement";

export const metadata = { title: "담당 클래스 운영 | DO:NUTS CLASS" };
export default async function LeaderClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassManagement id={id} basePath="/leader/class" />;
}
