import { saveClassSessionContent } from "@/app/classes/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClassSession } from "@/lib/classes/types";

export function SessionContentForm({ session }: { session: ClassSession }) {
  return <ActionForm key={`content:${session.id}:${session.revision}`} action={saveClassSessionContent} label="수업 내용 저장">
    <input type="hidden" name="class_id" value={session.class_id} />
    <input type="hidden" name="session_id" value={session.id} />
    <input type="hidden" name="revision" value={session.revision} />
    <div className="space-y-2"><Label htmlFor={`${session.id}-title`}>수업 제목</Label><Input id={`${session.id}-title`} name="title" defaultValue={session.title} maxLength={120} required className="h-11" /></div>
    <div className="space-y-2"><Label htmlFor={`${session.id}-description`}>수업 내용</Label><Textarea id={`${session.id}-description`} name="description" defaultValue={session.description} maxLength={4000} className="min-h-40" /></div>
  </ActionForm>;
}
