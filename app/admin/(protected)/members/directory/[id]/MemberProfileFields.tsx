"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DirectoryMember } from "@/lib/membership/admin-directory";

export function MemberProfileFields({ member, schools }: { member: DirectoryMember; schools: { id: string; name: string }[] }) {
  const [school, setSchool] = useState(member.school_id ?? "other");
  const [otherSchool, setOtherSchool] = useState(member.other_school_name ?? "");
  return <>
    <input type="hidden" name="user_id" value={member.id} />
    <input type="hidden" name="revision" value={member.revision} />
    <div className="space-y-2"><Label htmlFor="profile-name">이름</Label><Input id="profile-name" name="name" defaultValue={member.name} required maxLength={80} className="min-h-11" /></div>
    <div className="space-y-2"><Label htmlFor="profile-phone">전화번호</Label><Input id="profile-phone" name="phone" type="tel" defaultValue={member.phone} required maxLength={24} className="min-h-11" /></div>
    <div className="space-y-2"><Label htmlFor="profile-school">학교</Label><Select name="school_id" value={school} onValueChange={setSchool} required><SelectTrigger id="profile-school" className="min-h-11 w-full"><SelectValue placeholder="학교 선택" /></SelectTrigger><SelectContent>{schools.map(option => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}<SelectItem value="other">기타</SelectItem></SelectContent></Select></div>
    {school === "other" && <div className="space-y-2"><Label htmlFor="profile-other-school">학교명</Label><Input id="profile-other-school" name="other_school_name" required maxLength={120} value={otherSchool} onChange={event => setOtherSchool(event.target.value)} className="min-h-11" /></div>}
  </>;
}
