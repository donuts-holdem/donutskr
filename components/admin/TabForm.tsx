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
            <p className="text-muted-foreground text-xs">상단 메뉴에 표시되는 이름입니다.</p>
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
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
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="slug">연결 경로</Label>
            <Input id="slug" name="slug" defaultValue={tab?.slug ?? ""} placeholder="/schedule" />
            <p className="text-muted-foreground text-xs">
              내부 링크·특수 페이지 타입일 때 이동할 사이트 내 주소 (예: /schedule, 특수페이지의 슬러그)
            </p>
          </div>
          <div className="flex flex-col gap-2 md:col-span-6">
            <Label htmlFor="external_url">외부 URL</Label>
            <Input id="external_url" name="external_url" type="url" defaultValue={tab?.external_url ?? ""} placeholder="https://..." />
            <p className="text-muted-foreground text-xs">외부 링크 타입일 때 이동할 주소 (새 탭으로 열립니다)</p>
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
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="is_visible" name="is_visible" defaultChecked={tab?.is_visible ?? true} />
              <Label htmlFor="is_visible">노출</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="mobile_visible" name="mobile_visible" defaultChecked={tab?.mobile_visible ?? true} />
              <Label htmlFor="mobile_visible">모바일 노출</Label>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            노출을 체크하면 공개 사이트 상단 메뉴에 표시됩니다. 모바일 노출을 끄면 데스크톱 메뉴에만 보입니다.
            메뉴에서의 순서는 탭 관리 목록에서 드래그로 바꿉니다.
          </p>
        </CardContent>
      </Card>

      <div>
        <Button type="submit">저장</Button>
      </div>
    </form>
  );
}
