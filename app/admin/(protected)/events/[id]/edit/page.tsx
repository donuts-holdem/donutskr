import { notFound } from "next/navigation";
import { getEventById } from "@/lib/data/events";
import { getAllStructures } from "@/lib/data/blindStructures";
import { getAllSeasons } from "@/lib/data/seasons";
import { EventForm } from "@/components/admin/EventForm";
import { updateEvent, deleteEvent } from "@/app/admin/actions/events";
import { DeleteButton } from "@/components/admin/DeleteButton";

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
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>
        이벤트 수정: {event.title}
      </h1>
      <EventForm event={event} structures={structures} seasons={seasons} action={updateEvent.bind(null, id)} />
      <div className="border-t border-white/10" style={{ marginTop: "2rem", paddingTop: "1.5rem" }}>
        <p style={{ color: "var(--muted-3)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>위험 구역</p>
        <DeleteButton onDelete={deleteEvent.bind(null, id)} />
      </div>
    </div>
  );
}
