import { ClassManagement } from "@/components/classes/ClassManagement";

export const metadata = { title: "클래스 운영 | DO:NUTS Admin" };
export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassManagement id={id} basePath="/admin/classes" />;
}
