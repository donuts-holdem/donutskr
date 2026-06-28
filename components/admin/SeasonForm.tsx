"use client";

import type { Season } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePreview } from "@/components/admin/ImagePreview";
import { FileInput } from "@/components/admin/FileInput";

interface SeasonFormProps {
  season?: Season;
  action: (fd: FormData) => void | Promise<void>;
}

export function SeasonForm({ season, action }: SeasonFormProps) {
  return (
    <form action={action} className="flex max-w-4xl flex-col gap-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>기본 정보</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-8">
            <Label htmlFor="name">시즌명 *</Label>
            <Input id="name" name="name" defaultValue={season?.name ?? ""} required />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="year">연도 *</Label>
            <Input id="year" name="year" type="number" defaultValue={season?.year ?? new Date().getFullYear()} required />
          </div>
        </CardContent>
      </Card>

      {/* 기간 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>기간</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="start_date">시작일</Label>
            <Input id="start_date" name="start_date" type="date" defaultValue={season?.start_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="end_date">종료일</Label>
            <Input id="end_date" name="end_date" type="date" defaultValue={season?.end_date ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* 히어로 문구 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>히어로 문구</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="badge_text">배지 문구</Label>
            <Input id="badge_text" name="badge_text" defaultValue={season?.badge_text ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="hero_text">메인 문구</Label>
            <Input id="hero_text" name="hero_text" defaultValue={season?.hero_text ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="sub_text">서브 문구</Label>
            <Textarea id="sub_text" name="sub_text" rows={3} defaultValue={season?.sub_text ?? ""} />
            <p className="text-muted-foreground text-xs">줄바꿈(Enter)은 시리즈 페이지에 그대로 반영됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* 미디어 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>미디어</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="hero_image_file">히어로 이미지</Label>
            <ImagePreview src={season?.hero_image} />
            {season && <input type="hidden" name="hero_image_existing" value={season.hero_image ?? ""} />}
            <FileInput id="hero_image_file" name="hero_image_file" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="bg_image_file">배경 이미지</Label>
            <ImagePreview src={season?.bg_image} />
            {season && <input type="hidden" name="bg_image_existing" value={season.bg_image ?? ""} />}
            <FileInput id="bg_image_file" name="bg_image_file" />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
