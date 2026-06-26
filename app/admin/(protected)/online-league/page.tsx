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

const STATUSES = ["operating", "revamping", "preparing", "suspended", "hidden"] as const;

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
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
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
          <Label htmlFor="steps">스텝 (JSON 배열, 예: [&quot;1단계&quot;,&quot;2단계&quot;])</Label>
          <Textarea id="steps" name="steps" rows={3} defaultValue={JSON.stringify(league.steps)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="links">링크 (JSON 객체, 예: {`{"카카오":"url"}`})</Label>
          <Textarea id="links" name="links" rows={3} defaultValue={JSON.stringify(league.links)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="today_leagues">오늘의 리그 (JSON 배열)</Label>
          <Textarea id="today_leagues" name="today_leagues" rows={4} defaultValue={JSON.stringify(league.today_leagues)} />
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
