import { getAllSpecialPages } from "@/lib/data/specialPages";
import { updateSpecialPage } from "@/app/admin/actions/specialPages";
import { SpecialPageForm } from "@/components/admin/SpecialPageForm";
import { notFound } from "next/navigation";

export default async function EditSpecialPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pages = await getAllSpecialPages();
  const page = pages.find((p) => p.id === id);
  if (!page) notFound();

  async function action(fd: FormData) {
    "use server";
    await updateSpecialPage(id, fd);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>특수 페이지 수정</h1>
      <SpecialPageForm page={page} action={action} />
    </div>
  );
}
