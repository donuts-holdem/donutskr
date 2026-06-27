"use client";

import type { Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROGRAM_GROUP_OPTIONS, PROGRAM_STATUS_OPTIONS, normalizeProgramStatus } from "@/lib/labels";
import { ImagePreview } from "@/components/admin/ImagePreview";
import { ProgramRichEditor } from "@/components/admin/ProgramRichEditor";

interface ProgramFormProps {
  program?: Program;
  descriptionInitialHtml?: string;
  action: (fd: FormData) => void | Promise<void>;
}

export function ProgramForm({ program, descriptionInitialHtml, action }: ProgramFormProps) {
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
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="title">프로그램명 *</Label>
            <Input id="title" name="title" defaultValue={program?.title ?? ""} required />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="slug">슬러그 *</Label>
            <Input id="slug" name="slug" defaultValue={program?.slug ?? ""} required />
            <p className="text-muted-foreground text-xs">URL 경로로 쓰이는 고유값입니다. (영문/숫자/하이픈)</p>
          </div>
        </CardContent>
      </Card>

      {/* 분류 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>분류</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="program_group">그룹</Label>
            <Select name="program_group" defaultValue={program?.program_group ?? "poker"}>
              <SelectTrigger id="program_group" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_GROUP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="status">상태</Label>
            <Select name="status" defaultValue={normalizeProgramStatus(program?.status) || program?.status || undefined}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="-- 선택 --" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                {/* 표준 키로 매핑되지 않는 기존값은 원본 그대로 보존(다음 저장에서 덮이지 않게) */}
                {program?.status && normalizeProgramStatus(program.status) === "" && (
                  <SelectItem value={program.status}>{program.status} (원본값)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="category">카테고리 (표시용 라벨)</Label>
            <Input id="category" name="category" defaultValue={program?.category ?? ""} placeholder="예: 커뮤니티" />
          </div>
        </CardContent>
      </Card>

      {/* 기간·규모 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>기간·규모</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="start_date">시작일</Label>
            <Input id="start_date" name="start_date" type="date" defaultValue={program?.start_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="end_date">종료일</Label>
            <Input id="end_date" name="end_date" type="date" defaultValue={program?.end_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="location">지역</Label>
            <Input id="location" name="location" defaultValue={program?.location ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="member_count">인원</Label>
            <Input id="member_count" name="member_count" type="number" defaultValue={program?.member_count ?? 0} />
          </div>
        </CardContent>
      </Card>

      {/* 설명 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>설명</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgramRichEditor name="description_blocks" initialHtml={descriptionInitialHtml ?? ""} />
          {/* Preserve the legacy description column so the public fallback is never lost on save */}
          <input type="hidden" name="description" value={program?.description ?? ""} />
        </CardContent>
      </Card>

      {/* 미디어 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>미디어</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cover_image_file">커버 이미지</Label>
            <ImagePreview src={program?.cover_image} />
            {program && <input type="hidden" name="cover_image_existing" value={program.cover_image ?? ""} />}
            <Input id="cover_image_file" name="cover_image_file" type="file" accept="image/*" />
          </div>
        </CardContent>
      </Card>

      {/* 담당자 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>담당자</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="manager_name">담당자명</Label>
            <Input id="manager_name" name="manager_name" defaultValue={program?.manager_name ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="manager_role">담당자 역할</Label>
            <Input id="manager_role" name="manager_role" defaultValue={program?.manager_role ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="manager_avatar">담당자 아바타</Label>
            <Input id="manager_avatar" name="manager_avatar" defaultValue={program?.manager_avatar ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* 링크·CTA */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>링크·CTA</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="cta_label">CTA 문구</Label>
            <Input id="cta_label" name="cta_label" defaultValue={program?.cta_label ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="entry_link">참가 링크</Label>
            <Input id="entry_link" name="entry_link" type="url" defaultValue={program?.entry_link ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="external_url">외부 링크</Label>
            <Input id="external_url" name="external_url" type="url" defaultValue={program?.external_url ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* 노출 설정 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>노출 설정</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-wrap gap-6 md:col-span-12">
            <div className="flex items-center gap-2">
              <Checkbox id="is_hot" name="is_hot" defaultChecked={program?.is_hot ?? false} />
              <Label htmlFor="is_hot">HOT</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_affiliate" name="is_affiliate" defaultChecked={program?.is_affiliate ?? false} />
              <Label htmlFor="is_affiliate">제휴</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_visible" name="is_visible" defaultChecked={program?.is_visible ?? true} />
              <Label htmlFor="is_visible">노출</Label>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="sort_order">순서</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={program?.sort_order ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
