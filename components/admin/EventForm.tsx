"use client";

import type { Event, BlindStructure, Season } from "@/lib/types";
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
import { EVENT_STATUS_OPTIONS } from "@/lib/labels";
import { ImagePreview } from "@/components/admin/ImagePreview";
import { FileInput } from "@/components/admin/FileInput";

interface EventFormProps {
  event?: Event;
  structures: BlindStructure[];
  seasons?: Season[];
  action: (fd: FormData) => void | Promise<void>;
}

export function EventForm({ event, structures, seasons = [], action }: EventFormProps) {
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
          {/* 카테고리: 운영자에겐 무의미해 숨김. 기존값 보존(신규는 upcoming). */}
          <input type="hidden" name="category" value={event?.category ?? "upcoming"} />

          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="title">이벤트명 *</Label>
            <Input id="title" name="title" defaultValue={event?.title ?? ""} required />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
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
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="status">상태</Label>
            <Select name="status" defaultValue={event?.status ?? "scheduled"}>
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
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="event_type">이벤트 타입</Label>
            <Input id="event_type" name="event_type" defaultValue={event?.event_type ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="description">설명</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={event?.description ?? ""} />
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
            <Label htmlFor="weekday">요일</Label>
            <Input id="weekday" name="weekday" defaultValue={event?.weekday ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="start_time">시작 시간</Label>
            <Input id="start_time" name="start_time" defaultValue={event?.start_time ?? ""} placeholder="예: 14:00" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="reg_close_time">레지 마감 시간</Label>
            <Input id="reg_close_time" name="reg_close_time" defaultValue={event?.reg_close_time ?? ""} placeholder="예: 16:00" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="location">장소</Label>
            <Input id="location" name="location" defaultValue={event?.location ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="address">주소</Label>
            <Input id="address" name="address" defaultValue={event?.address ?? ""} />
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

      {/* 미디어 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>미디어</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="poster_image_file">포스터 이미지</Label>
            <ImagePreview src={event?.poster_image} />
            {event && <input type="hidden" name="poster_image_existing" value={event.poster_image ?? ""} />}
            <FileInput id="poster_image_file" name="poster_image_file" />
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
            <Label htmlFor="timer_event_id">타이머 이벤트 ID</Label>
            <Input id="timer_event_id" name="timer_event_id" defaultValue={event?.timer_event_id ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="timer_event_url">타이머 URL</Label>
            <Input id="timer_event_url" name="timer_event_url" type="url" defaultValue={event?.timer_event_url ?? ""} />
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
          <div className="flex items-center gap-2 md:col-span-12">
            <Checkbox id="is_visible" name="is_visible" defaultChecked={event?.is_visible ?? true} />
            <Label htmlFor="is_visible">노출 여부</Label>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
