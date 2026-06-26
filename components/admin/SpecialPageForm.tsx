"use client";
import type { SpecialPage, BlindStructure } from "@/lib/types";
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

interface SpecialPageFormProps {
  page?: SpecialPage;
  structures?: BlindStructure[];
  action: (fd: FormData) => void | Promise<void>;
}

export function SpecialPageForm({ page, structures = [], action }: SpecialPageFormProps) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">슬러그 (slug) *</Label>
        <Input id="slug" name="slug" defaultValue={page?.slug ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="label">레이블</Label>
        <Input id="label" name="label" defaultValue={page?.label ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">제목 *</Label>
        <Input id="title" name="title" defaultValue={page?.title ?? ""} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={page?.description ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">날짜</Label>
        <Input id="date" name="date" type="date" defaultValue={page?.date ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="venue">장소</Label>
        <Input id="venue" name="venue" defaultValue={page?.venue ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">주소</Label>
        <Input id="address" name="address" defaultValue={page?.address ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="start_time">시작 시간</Label>
        <Input id="start_time" name="start_time" defaultValue={page?.start_time ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="entry_link">참가 링크</Label>
        <Input id="entry_link" name="entry_link" type="url" defaultValue={page?.entry_link ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cta_label">CTA 레이블</Label>
        <Input id="cta_label" name="cta_label" defaultValue={page?.cta_label ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sponsor_name">스폰서명</Label>
        <Input id="sponsor_name" name="sponsor_name" defaultValue={page?.sponsor_name ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sponsor_logo_file">스폰서 로고</Label>
        {page?.sponsor_logo && (
          <p className="text-muted-foreground text-xs break-all">{page.sponsor_logo}</p>
        )}
        {page && <input type="hidden" name="sponsor_logo_existing" value={page.sponsor_logo ?? ""} />}
        <Input id="sponsor_logo_file" name="sponsor_logo_file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="poster_file">포스터</Label>
        {page?.poster && (
          <p className="text-muted-foreground text-xs break-all">{page.poster}</p>
        )}
        {page && <input type="hidden" name="poster_existing" value={page.poster ?? ""} />}
        <Input id="poster_file" name="poster_file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="gallery">갤러리 (JSON 배열, 예: [&quot;url1&quot;,&quot;url2&quot;])</Label>
        <Textarea id="gallery" name="gallery" rows={3} defaultValue={JSON.stringify(page?.gallery ?? [])} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="info_cards">정보 카드 (JSON 배열, 예: [{`{"label":"","value":""}`}])</Label>
        <Textarea id="info_cards" name="info_cards" rows={3} defaultValue={JSON.stringify(page?.info_cards ?? [])} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note_list">노트 목록 (JSON 배열, 예: [&quot;항목1&quot;,&quot;항목2&quot;])</Label>
        <Textarea id="note_list" name="note_list" rows={3} defaultValue={JSON.stringify(page?.note_list ?? [])} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="blind_structure_id">블라인드 스트럭처</Label>
        <Select name="blind_structure_id" defaultValue={page?.blind_structure_id ?? undefined}>
          <SelectTrigger id="blind_structure_id" className="w-full">
            <SelectValue placeholder="-- 없음 --" />
          </SelectTrigger>
          <SelectContent>
            {structures.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="start_show_date">노출 시작일</Label>
        <Input id="start_show_date" name="start_show_date" type="date" defaultValue={page?.start_show_date ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="end_show_date">노출 종료일</Label>
        <Input id="end_show_date" name="end_show_date" type="date" defaultValue={page?.end_show_date ?? ""} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="is_visible" name="is_visible" defaultChecked={page?.is_visible ?? true} />
        <Label htmlFor="is_visible">노출</Label>
      </div>
      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
