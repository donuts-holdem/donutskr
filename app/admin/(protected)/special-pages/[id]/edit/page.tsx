import { getAllSpecialPages } from "@/lib/data/specialPages";
import { getAllStructures } from "@/lib/data/blindStructures";
import { updateSpecialPage } from "@/app/admin/actions/specialPages";
import { SpecialPageForm } from "@/components/admin/SpecialPageForm";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";
import { notFound } from "next/navigation";

export default async function EditSpecialPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pages, structures] = await Promise.all([getAllSpecialPages(), getAllStructures()]);
  const page = pages.find((p) => p.id === id);
  if (!page) notFound();

  async function action(fd: FormData) {
    "use server";
    await updateSpecialPage(id, fd);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-gold)" }}>특수 페이지 수정</h1>
        <ViewOnSiteLink href={`/${page.slug}`} />
      </div>
      <SpecialPageForm page={page} structures={structures} action={action} />
    </div>
  );
}
