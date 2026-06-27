import { getAllStructures } from "@/lib/data/blindStructures";
import { getAllSeasons } from "@/lib/data/seasons";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/app/admin/actions/events";

export default async function NewEventPage() {
  const [structures, seasons] = await Promise.all([getAllStructures(), getAllSeasons()]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gold">새 이벤트 생성</h1>
      <EventForm structures={structures} seasons={seasons} action={createEvent} />
    </div>
  );
}
