import { getOnlineLeague } from "@/lib/data/onlineLeague";
import { updateOnlineLeague } from "@/app/admin/actions/onlineLeague";
import { OnlineLeagueForm } from "@/components/admin/OnlineLeagueForm";

export default async function OnlineLeaguePage() {
  const league = await getOnlineLeague();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gold">온라인 리그 설정</h1>
      <OnlineLeagueForm league={league} action={updateOnlineLeague} />
    </div>
  );
}
