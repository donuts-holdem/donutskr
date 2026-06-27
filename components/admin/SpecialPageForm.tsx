"use client";
import type { SpecialPage, BlindStructure } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RepeatableFieldEditor } from "@/components/admin/RepeatableFieldEditor";
import { ImagePreview } from "@/components/admin/ImagePreview";
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
        <ImagePreview src={page?.sponsor_logo} />
        {page && <input type="hidden" name="sponsor_logo_existing" value={page.sponsor_logo ?? ""} />}
        <Input id="sponsor_logo_file" name="sponsor_logo_file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="poster_file">포스터</Label>
        <ImagePreview src={page?.poster} />
        {page && <input type="hidden" name="poster_existing" value={page.poster ?? ""} />}
        <Input id="poster_file" name="poster_file" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>갤러리 (이미지 URL)</Label>
        <RepeatableFieldEditor<string>
          name="gallery"
          initial={page?.gallery ?? []}
          makeEmpty={() => ""}
          addLabel="이미지 추가"
          emptyHint="추가된 이미지가 없습니다."
          renderRow={(value, onChange) => (
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="이미지 URL" className="flex-1" />
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>정보 카드</Label>
        <RepeatableFieldEditor<{ label: string; value: string }>
          name="info_cards"
          initial={page?.info_cards ?? []}
          makeEmpty={() => ({ label: "", value: "" })}
          addLabel="카드 추가"
          emptyHint="추가된 카드가 없습니다."
          renderRow={(card, onChange) => (
            <>
              <Input value={card.label} onChange={(e) => onChange({ ...card, label: e.target.value })} placeholder="항목 (예: 날짜)" className="w-40" />
              <Input value={card.value} onChange={(e) => onChange({ ...card, value: e.target.value })} placeholder="내용 (예: 6/9 화요일 16:00)" className="flex-1" />
            </>
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>노트 목록</Label>
        <RepeatableFieldEditor<string>
          name="note_list"
          initial={page?.note_list ?? []}
          makeEmpty={() => ""}
          addLabel="노트 추가"
          emptyHint="추가된 노트가 없습니다."
          renderRow={(value, onChange) => (
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="안내 문구" className="flex-1" />
          )}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="blind_structure_id">블라인드 스트럭처</Label>
        <Select name="blind_structure_id" defaultValue={page?.blind_structure_id ?? "none"}>
          <SelectTrigger id="blind_structure_id" className="w-full">
            <SelectValue placeholder="-- 없음 --" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">없음</SelectItem>
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
