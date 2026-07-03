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
import { ImageField } from "@/components/admin/ImageField";
import { ProgramRichEditor } from "@/components/admin/ProgramRichEditor";

interface OptionItem {
  value: string;
  label: string;
}

interface ProgramFormProps {
  program?: Program;
  descriptionInitialHtml?: string;
  // Admin-managed option lists (from program_options). Fall back to the static
  // labels so the form still renders in isolation (e.g. unit tests).
  groupOptions?: OptionItem[];
  statusOptions?: OptionItem[];
  action: (fd: FormData) => void | Promise<void>;
}

const DEFAULT_STATUS_OPTIONS: OptionItem[] = PROGRAM_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export function ProgramForm({
  program,
  descriptionInitialHtml,
  action,
  groupOptions = PROGRAM_GROUP_OPTIONS,
  statusOptions = DEFAULT_STATUS_OPTIONS,
}: ProgramFormProps) {
  // Group: keep the stored value even if its option was removed (no data loss).
  const groupValues = new Set(groupOptions.map((o) => o.value));
  const groupDefault = program?.program_group ?? groupOptions[0]?.value ?? "poker";
  const groupFallback = groupDefault && !groupValues.has(groupDefault) ? groupDefault : null;

  // Status: prefer the raw stored value if it's a live option, else its
  // normalized standard key, else preserve the raw value via a fallback item.
  const statusValues = new Set(statusOptions.map((o) => o.value));
  const rawStatus = program?.status ?? "";
  const normalizedStatus = normalizeProgramStatus(rawStatus);
  const statusDefault = statusValues.has(rawStatus)
    ? rawStatus
    : statusValues.has(normalizedStatus)
      ? normalizedStatus
      : rawStatus || undefined;
  const statusFallback = statusDefault && !statusValues.has(statusDefault) ? statusDefault : null;

  return (
    <form action={action} className="flex max-w-4xl flex-col gap-6">
      {/* 기본 정보 + 담당자 (같은 줄, 각 절반 폭) */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>기본 정보</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-5">
              {/* 좌: 프로그램명 · 슬러그 (각각 다른 줄) */}
              <div className="flex flex-1 flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="title">프로그램명 *</Label>
                  <Input id="title" name="title" defaultValue={program?.title ?? ""} required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="slug">슬러그 *</Label>
                  <Input id="slug" name="slug" defaultValue={program?.slug ?? ""} required />
                  <p className="text-muted-foreground text-xs">URL 경로로 쓰이는 고유값입니다. (영문/숫자/하이픈)</p>
                </div>
              </div>
              {/* 우: 커버 이미지 */}
              <div className="flex flex-col gap-2 sm:w-32">
                <Label htmlFor="cover_image_file">커버 이미지</Label>
                <ImageField name="cover_image" existing={program?.cover_image} className="h-32 w-32 sm:w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h2>담당자</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-5">
              {/* 좌: 담당자명 · 역할 (각각 다른 줄) */}
              <div className="flex flex-1 flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="manager_name">담당자명</Label>
                  <Input id="manager_name" name="manager_name" defaultValue={program?.manager_name ?? ""} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="manager_role">담당자 역할</Label>
                  <Input id="manager_role" name="manager_role" defaultValue={program?.manager_role ?? ""} />
                </div>
              </div>
              {/* 우: 담당자 아바타 */}
              <div className="flex flex-col gap-2 sm:w-32">
                <Label htmlFor="manager_avatar_file">담당자 아바타</Label>
                <ImageField name="manager_avatar" existing={program?.manager_avatar} className="h-32 w-32 sm:w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
            <Select name="program_group" defaultValue={groupDefault}>
              <SelectTrigger id="program_group" className="w-full">
                <SelectValue placeholder="-- 선택 --" />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                {/* 삭제된 옵션 등 목록에 없는 기존값은 원본 그대로 보존 */}
                {groupFallback && (
                  <SelectItem value={groupFallback}>{groupFallback} (원본값)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="status">상태</Label>
            <Select name="status" defaultValue={statusDefault}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="-- 선택 --" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                {/* 옵션 목록에 없는 기존값(레거시/삭제된 옵션)은 원본 그대로 보존 */}
                {statusFallback && (
                  <SelectItem value={statusFallback}>{statusFallback} (원본값)</SelectItem>
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
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="start_date">시작일</Label>
            <Input id="start_date" name="start_date" type="date" defaultValue={program?.start_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="end_date">종료일</Label>
            <Input id="end_date" name="end_date" type="date" defaultValue={program?.end_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="location">지역</Label>
            <Input id="location" name="location" defaultValue={program?.location ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="member_count">인원</Label>
            <Input id="member_count" name="member_count" type="number" defaultValue={program?.member_count ?? 0} />
            <p className="text-muted-foreground text-xs">내부 기록용 — 공개 사이트에는 표시되지 않습니다.</p>
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
            <Label htmlFor="entry_link">링크</Label>
            <Input id="entry_link" name="entry_link" type="url" defaultValue={program?.entry_link ?? ""} />
            <p className="text-muted-foreground text-xs">상세 페이지의 참가 신청 버튼이 여는 주소 (외부 주소면 새 탭)</p>
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
              <Checkbox id="is_visible" name="is_visible" defaultChecked={program?.is_visible ?? true} />
              <Label htmlFor="is_visible">노출</Label>
            </div>
          </div>
          <p className="text-muted-foreground md:col-span-12 text-xs">
            노출 순서는 프로그램 목록의 &ldquo;순서 편집&rdquo;에서 드래그로 변경합니다.
            종료일이 지난 프로그램은 공개 사이트에서 자동으로 숨겨집니다.
          </p>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
