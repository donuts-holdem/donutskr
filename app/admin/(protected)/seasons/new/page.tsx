import { SeasonForm } from "@/components/admin/SeasonForm";
import { createSeason } from "@/app/admin/actions/seasons";

export default function NewSeasonPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 시즌 생성</h1>
      <SeasonForm action={createSeason} />
    </div>
  );
}
