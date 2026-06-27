import { getAllTabs } from "@/lib/data/tabs";
import { updateTab } from "@/app/admin/actions/tabs";
import { TabForm } from "@/components/admin/TabForm";
import { notFound } from "next/navigation";

export default async function EditTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tabs = await getAllTabs();
  const tab = tabs.find((t) => t.id === id);
  if (!tab) notFound();

  async function action(fd: FormData) {
    "use server";
    await updateTab(id, fd);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">탭 수정</h1>
      <TabForm tab={tab} action={action} />
    </div>
  );
}
