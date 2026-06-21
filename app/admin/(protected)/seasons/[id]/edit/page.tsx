import { notFound } from "next/navigation";
import { getSeasonById } from "@/lib/data/seasons";
import { SeasonForm } from "@/components/admin/SeasonForm";
import { updateSeason, deleteSeason } from "@/app/admin/actions/seasons";
import { DeleteButton } from "@/components/admin/DeleteButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeasonPage({ params }: Props) {
  const { id } = await params;
  const season = await getSeasonById(id);

  if (!season) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>
        시즌 수정: {season.name}
      </h1>
      <SeasonForm season={season} action={updateSeason.bind(null, id)} />
      <div className="border-t border-white/10" style={{ marginTop: "2rem", paddingTop: "1.5rem" }}>
        <p style={{ color: "var(--muted-3)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>위험 구역</p>
        <DeleteButton onDelete={deleteSeason.bind(null, id)} />
      </div>
    </div>
  );
}
