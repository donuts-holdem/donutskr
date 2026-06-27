import { notFound } from "next/navigation";
import { getSeasonById } from "@/lib/data/seasons";
import { SeasonForm } from "@/components/admin/SeasonForm";
import { updateSeason, deleteSeason } from "@/app/admin/actions/seasons";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeasonPage({ params }: Props) {
  const { id } = await params;
  const season = await getSeasonById(id);

  if (!season) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gold">
          시즌 수정: {season.name}
        </h1>
        <ViewOnSiteLink href="/series" label="시리즈에서 보기" />
      </div>
      <SeasonForm season={season} action={updateSeason.bind(null, id)} />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-muted-foreground text-xs mb-3">위험 구역</p>
        <DeleteButton onDelete={deleteSeason.bind(null, id)} />
      </div>
    </div>
  );
}
