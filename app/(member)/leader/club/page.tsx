import { ClubManagementIndex } from "@/components/clubs/ClubManagement";

export const metadata = { title: "담당 클럽 | DO:NUTS CLASS" };
export default function LeaderClubsPage() {
  return <ClubManagementIndex basePath="/leader/club" />;
}
