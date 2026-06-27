import { notFound } from "next/navigation";
import { getEventById } from "@/lib/data/events";
import { getAllStructures } from "@/lib/data/blindStructures";
import { getAllSeasons } from "@/lib/data/seasons";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent, deleteEvent } from "@/app/admin/actions/events";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ViewOnSiteLink } from "@/components/admin/ViewOnSiteLink";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, structures, seasons] = await Promise.all([
    getEventById(id),
    getAllStructures(),
    getAllSeasons(),
  ]);

  if (!event) notFound();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gold">
          이벤트 수정: {event.title}
        </h1>
        <ViewOnSiteLink href={`/schedule/${event.id}`} />
      </div>
      <EventForm event={event} structures={structures} seasons={seasons} action={updateEvent.bind(null, id)} />
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-muted-foreground text-xs mb-3">위험 구역</p>
        <DeleteButton onDelete={deleteEvent.bind(null, id)} />
      </div>
    </div>
  );
}
