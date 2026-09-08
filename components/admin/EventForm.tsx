"use client";

import type { Event, BlindStructure, Season } from "@/lib/legacy/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_OPTIONS, eventStatusLabel } from "@/lib/legacy/labels";
import { toStoredStatus } from "@/lib/legacy/event-status";
import type { DerivedEventStatus } from "@/lib/legacy/types";
import { ImageField } from "@/components/admin/ImageField";

interface EventFormProps {
  event?: Event;
  structures: BlindStructure[];
  seasons?: Season[];
  /** The current DISPLAY status, derived on the server, shown read-only on edit. */
  derivedStatus?: DerivedEventStatus;
  action: (fd: FormData) => void | Promise<void>;
}

export function EventForm({ event, structures, seasons = [], derivedStatus, action }: EventFormProps) {
  return (
    <form action={action} className="flex max-w-4xl flex-col gap-6">
      {/* 기본 정보 — 좌: 텍스트 / 우: 포스터 (프로그램 폼과 동일 패턴) */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>기본 정보</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* 좌: 텍스트 입력 */}
            <div className="flex flex-1 flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">이벤트명 *</Label>
                <Input id="title" name="title" defaultValue={event?.title ?? ""} required />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="season_id">시즌</Label>
                  <Select name="season_id" defaultValue={event?.season_id ?? "none"}>
                    <SelectTrigger id="season_id" className="w-full">
                      <SelectValue placeholder="-- 선택 --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">상태</Label>
                  <Select name="status" defaultValue={toStoredStatus(event?.status)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    자동: 날짜·시간에 따라 예정→진행중→레지마감→완료로 표시
                  </p>
                  {derivedStatus && (
                    <p className="text-muted-foreground text-xs">
                      현재 표시 상태:{" "}
                      <span className="text-foreground font-medium">
                        {eventStatusLabel(derivedStatus)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">설명</Label>
                <Textarea id="description" name="description" rows={4} defaultValue={event?.description ?? ""} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox id="is_visible" name="is_visible" defaultChecked={event?.is_visible ?? true} />
                <Label htmlFor="is_visible">노출 여부</Label>
              </div>
            </div>
            {/* 우: 포스터 이미지 */}
            <div className="flex flex-col gap-2 sm:w-40">
              <Label htmlFor="poster_image_file">포스터 이미지</Label>
              <ImageField name="poster_image" existing={event?.poster_image} className="h-40 w-40 sm:w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 일정·장소 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>일정·장소</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="date">날짜</Label>
            <Input id="date" name="date" type="date" defaultValue={event?.date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="start_time">시작 시간</Label>
            <Input id="start_time" name="start_time" defaultValue={event?.start_time ?? ""} placeholder="예: 14:00" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="reg_close_time">레지 마감 시간</Label>
            <Input id="reg_close_time" name="reg_close_time" defaultValue={event?.reg_close_time ?? ""} placeholder="예: 16:00" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="location">장소</Label>
            <Input id="location" name="location" defaultValue={event?.location ?? ""} />
            <p className="text-muted-foreground text-xs">지점명과 주소를 함께 입력 (예: 파이널나인 외대점 (서울 동대문구 휘경로3길 4))</p>
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="organizer">기획 단체</Label>
            <Input id="organizer" name="organizer" defaultValue={event?.organizer ?? ""} placeholder="예: 도너츠" />
            <p className="text-muted-foreground text-xs">이벤트를 주최·기획한 단체 (예: 도너츠). 캘린더에서 단체명이 골드로 강조 표기됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* 참가 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>참가</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="buy_in">참가비</Label>
            <Input id="buy_in" name="buy_in" defaultValue={event?.buy_in ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-8">
            <Label htmlFor="button_label">버튼 문구</Label>
            <Input id="button_label" name="button_label" defaultValue={event?.button_label ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="entry_link">참가 링크</Label>
            <Input id="entry_link" name="entry_link" type="url" defaultValue={event?.entry_link ?? ""} />
          </div>
        </CardContent>
      </Card>

      {/* 토너먼트 설정 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>토너먼트 설정</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="blind_structure_id">블라인드 스트럭처</Label>
            <Select name="blind_structure_id" defaultValue={event?.blind_structure_id ?? "none"}>
              <SelectTrigger id="blind_structure_id" className="w-full">
                <SelectValue placeholder="-- 선택 --" />
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
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="starting_stack">스타팅 스택</Label>
            <Input
              id="starting_stack"
              name="starting_stack"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={event?.starting_stack ?? ""}
              placeholder="예: 30000"
            />
            <p className="text-muted-foreground text-xs">토너먼트 시작 시 참가자에게 지급하는 칩 수입니다.</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
