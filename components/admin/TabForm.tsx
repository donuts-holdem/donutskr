"use client";
import type { NavTab } from "@/lib/types";
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
import { TAB_TYPE_OPTIONS } from "@/lib/labels";

interface TabFormProps {
  tab?: NavTab;
  action: (fd: FormData) => void | Promise<void>;
}

export function TabForm({ tab, action }: TabFormProps) {
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
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={tab?.name ?? ""} required />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="key">키 (key)</Label>
            <Input id="key" name="key" defaultValue={tab?.key ?? ""} required />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="type">타입</Label>
            <Select name="type" defaultValue={tab?.type ?? "internal"}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAB_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-8">
            <Label htmlFor="slug">슬러그 (slug)</Label>
            <Input id="slug" name="slug" defaultValue={tab?.slug ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="external_url">외부 URL</Label>
            <Input id="external_url" name="external_url" type="url" defaultValue={tab?.external_url ?? ""} />
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
              <Checkbox id="is_visible" name="is_visible" defaultChecked={tab?.is_visible ?? true} />
              <Label htmlFor="is_visible">노출</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="mobile_visible" name="mobile_visible" defaultChecked={tab?.mobile_visible ?? true} />
              <Label htmlFor="mobile_visible">모바일 노출</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="home_card_visible" name="home_card_visible" defaultChecked={tab?.home_card_visible ?? false} />
              <Label htmlFor="home_card_visible">홈카드 노출</Label>
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs md:col-span-12">
            홈카드 노출은 홈 화면에 이 탭을 카드로 보여줄지 여부입니다. (아래 홈카드 내용 사용)
          </p>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="start_show_date">기간 노출 시작일</Label>
            <Input id="start_show_date" name="start_show_date" type="date" defaultValue={tab?.start_show_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-4">
            <Label htmlFor="end_show_date">기간 노출 종료일</Label>
            <Input id="end_show_date" name="end_show_date" type="date" defaultValue={tab?.end_show_date ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-3">
            <Label htmlFor="sort_order">순서</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={tab?.sort_order ?? 0} />
          </div>
        </CardContent>
      </Card>

      {/* 홈카드 */}
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h2>홈카드</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-12">
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="home_card_title">홈카드 제목</Label>
            <Input id="home_card_title" name="home_card_title" defaultValue={tab?.home_card_title ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="home_card_cta">홈카드 CTA</Label>
            <Input id="home_card_cta" name="home_card_cta" defaultValue={tab?.home_card_cta ?? ""} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-12">
            <Label htmlFor="home_card_desc">홈카드 설명</Label>
            <Input id="home_card_desc" name="home_card_desc" defaultValue={tab?.home_card_desc ?? ""} />
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
