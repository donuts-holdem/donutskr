import { ClassManagementIndex } from "@/components/classes/ClassManagement";

export const metadata = { title: "클래스 관리 | DO:NUTS Admin" };
export default function ClassesPage() {
  return <ClassManagementIndex basePath="/admin/classes" />;
}
