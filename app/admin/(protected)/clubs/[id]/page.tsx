import { ClubManagement } from "@/components/clubs/ClubManagement";

export const metadata = { title: "클럽 운영 | DO:NUTS Admin" };
export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClubManagement id={id} basePath="/admin/clubs" />;
}
