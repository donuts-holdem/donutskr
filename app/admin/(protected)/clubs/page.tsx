import { ClubManagementIndex } from "@/components/clubs/ClubManagement";

export const metadata = { title: "클럽 관리 | DO:NUTS Admin" };
export default function ClubsPage() {
  return <ClubManagementIndex basePath="/admin/clubs" />;
}
