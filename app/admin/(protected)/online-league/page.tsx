import { getOnlineLeague } from "@/lib/data/onlineLeague";
import { updateOnlineLeague } from "@/app/admin/actions/onlineLeague";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { LEAGUE_STATUS_OPTIONS } from "@/lib/labels";

export default async function OnlineLeaguePage() {
  const league = await getOnlineLeague();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gold">온라인 리그 설정</h1>
      <form action={updateOnlineLeague} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">상태</Label>
          <Select name="status" defaultValue={league.status}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAGUE_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="tab_visible" name="tab_visible" defaultChecked={league.tab_visible} />
          <Label htmlFor="tab_visible">탭 노출</Label>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" defaultValue={league.title ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">설명</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={league.description ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="join_guide">가입 안내</Label>
          <Textarea id="join_guide" name="join_guide" rows={3} defaultValue={league.join_guide ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>스텝</Label>
          <RepeatableFieldEditor<string>
            name="steps"
            initial={league.steps}
            makeEmpty={() => ""}
            addLabel="스텝 추가"
            emptyHint="추가된 스텝이 없습니다."
            renderRow={(value, onChange) => (
              <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="예: 1단계 — 카카오 입장" className="flex-1" />
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>링크</Label>
          <RepeatableFieldEditor<{ key: string; value: string }>
            name="links"
            initial={Object.entries(league.links).map(([key, value]) => ({ key, value }))}
            makeEmpty={() => ({ key: "", value: "" })}
            addLabel="링크 추가"
            emptyHint="추가된 링크가 없습니다."
            serialize={(rows) =>
              JSON.stringify(Object.fromEntries(rows.filter((r) => r.key.trim() !== "").map((r) => [r.key, r.value])))
            }
            renderRow={(row, onChange) => (
              <>
                <Input value={row.key} onChange={(e) => onChange({ ...row, key: e.target.value })} placeholder="이름 (예: 카카오)" className="w-40" />
                <Input value={row.value} onChange={(e) => onChange({ ...row, value: e.target.value })} placeholder="URL" className="flex-1" />
              </>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>오늘의 리그</Label>
          <RepeatableFieldEditor<{ name: string; time?: string; reg_close?: string; link?: string }>
            name="today_leagues"
            initial={league.today_leagues}
            makeEmpty={() => ({ name: "", time: "", reg_close: "", link: "" })}
            addLabel="리그 추가"
            emptyHint="추가된 리그가 없습니다."
            renderRow={(row, onChange) => (
              <>
                <Input value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} placeholder="리그명" className="w-40" />
                <Input value={row.time ?? ""} onChange={(e) => onChange({ ...row, time: e.target.value })} placeholder="시간 (예: 20:00)" className="w-28" />
                <Input value={row.reg_close ?? ""} onChange={(e) => onChange({ ...row, reg_close: e.target.value })} placeholder="레지마감" className="w-28" />
                <Input value={row.link ?? ""} onChange={(e) => onChange({ ...row, link: e.target.value })} placeholder="링크" className="flex-1" />
              </>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notice_text">공지 텍스트</Label>
          <Textarea id="notice_text" name="notice_text" rows={2} defaultValue={league.notice_text ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cta_label">CTA 레이블</Label>
          <Input id="cta_label" name="cta_label" defaultValue={league.cta_label ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cta_url">CTA URL</Label>
          <Input id="cta_url" name="cta_url" type="url" defaultValue={league.cta_url ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sheet_url">시트 URL</Label>
          <Input id="sheet_url" name="sheet_url" type="url" defaultValue={league.sheet_url ?? ""} />
        </div>
        <div>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </div>
  );
}
