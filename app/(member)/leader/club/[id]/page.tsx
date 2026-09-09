import { ClubManagement } from "@/components/clubs/ClubManagement";

export const metadata = { title: "담당 클럽 운영 | DO:NUTS CLASS" };
export default async function LeaderClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClubManagement id={id} basePath="/leader/club" />;
}
