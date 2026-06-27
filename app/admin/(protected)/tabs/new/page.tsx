import { TabForm } from "@/components/admin/TabForm";
import { createTab } from "@/app/admin/actions/tabs";

export default async function NewTabPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 탭 만들기</h1>
      <TabForm action={createTab} />
    </div>
  );
}
