import { ClassManagementIndex } from "@/components/classes/ClassManagement";

export const metadata = { title: "담당 클래스 | DO:NUTS CLASS" };
export default function LeaderClassesPage() {
  return <ClassManagementIndex basePath="/leader/class" />;
}
