"use client";

import type { Season, SeasonCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SeasonFormProps {
  season?: Season;
  action: (fd: FormData) => void | Promise<void>;
}

const SEASON_CODES: { value: SeasonCode; label: string }[] = [
  { value: "spring", label: "봄 (spring)" },
  { value: "summer", label: "여름 (summer)" },
  { value: "autumn", label: "가을 (autumn)" },
  { value: "winter", label: "겨울 (winter)" },
];

export function SeasonForm({ season, action }: SeasonFormProps) {
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      {/* 시즌명 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">시즌명</Label>
        <Input id="name" name="name" defaultValue={season?.name ?? ""} required />
      </div>

      {/* 코드 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">코드</Label>
        <Select name="code" defaultValue={season?.code ?? "spring"}>
          <SelectTrigger id="code" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASON_CODES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 연도 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="year">연도</Label>
        <Input id="year" name="year" type="number" defaultValue={season?.year ?? new Date().getFullYear()} required />
      </div>

      {/* 시작일 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="start_date">시작일</Label>
        <Input id="start_date" name="start_date" type="date" defaultValue={season?.start_date ?? ""} />
      </div>

      {/* 종료일 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="end_date">종료일</Label>
        <Input id="end_date" name="end_date" type="date" defaultValue={season?.end_date ?? ""} />
      </div>

      {/* 메인 문구 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="hero_text">메인 문구</Label>
        <Input id="hero_text" name="hero_text" defaultValue={season?.hero_text ?? ""} />
      </div>

      {/* 서브 문구 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="sub_text">서브 문구</Label>
        <Input id="sub_text" name="sub_text" defaultValue={season?.sub_text ?? ""} />
      </div>

      {/* 배지 문구 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="badge_text">배지 문구</Label>
        <Input id="badge_text" name="badge_text" defaultValue={season?.badge_text ?? ""} />
      </div>

      {/* 히어로 이미지 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="hero_image_file">히어로 이미지</Label>
        {season?.hero_image && (
          <p className="text-muted-foreground text-xs break-all">{season.hero_image}</p>
        )}
        {season && <input type="hidden" name="hero_image_existing" value={season.hero_image ?? ""} />}
        <Input id="hero_image_file" name="hero_image_file" type="file" accept="image/*" />
      </div>

      {/* 배경 이미지 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bg_image_file">배경 이미지</Label>
        {season?.bg_image && (
          <p className="text-muted-foreground text-xs break-all">{season.bg_image}</p>
        )}
        {season && <input type="hidden" name="bg_image_existing" value={season.bg_image ?? ""} />}
        <Input id="bg_image_file" name="bg_image_file" type="file" accept="image/*" />
      </div>

      {/* 테마 색상 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="theme_color">테마 색상</Label>
        <Input id="theme_color" name="theme_color" defaultValue={season?.theme_color ?? ""} placeholder="예: #FFE58A" />
      </div>

      {/* 푸터 스폰서 표시 */}
      <div className="flex items-center gap-2">
        <Checkbox id="footer_sponsor_visible" name="footer_sponsor_visible" defaultChecked={season?.footer_sponsor_visible ?? false} />
        <Label htmlFor="footer_sponsor_visible">푸터 스폰서 표시</Label>
      </div>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
