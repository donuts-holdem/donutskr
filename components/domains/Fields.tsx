"use client";

import { useId, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Field({ name, label, defaultValue, type = "text", required = true, min, maxLength }: {
  name: string; label: string; defaultValue?: string | number; type?: string; required?: boolean; min?: number; maxLength?: number;
}) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} type={type} defaultValue={defaultValue} required={required} min={min} maxLength={maxLength} className="min-h-11" /></div>;
}
export function Area({ name, label, defaultValue, required = true, maxLength = 4000 }: {
  name: string; label: string; defaultValue?: string; required?: boolean; maxLength?: number;
}) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} name={name} defaultValue={defaultValue} required={required} maxLength={maxLength} rows={4} /></div>;
}
export function Check({ name, children, defaultChecked, required = false }: { name: string; children: ReactNode; defaultChecked?: boolean; required?: boolean }) {
  return <Label className="flex min-h-11 items-start gap-3 py-2 leading-relaxed"><Checkbox name={name} defaultChecked={defaultChecked} required={required} className="mt-1" />{children}</Label>;
}
export function Pick({ name, label, options, defaultValue, required = true }: {
  name: string; label: string; options: { value: string; label: string }[]; defaultValue?: string; required?: boolean;
}) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>
    <Select name={name} defaultValue={defaultValue || undefined} required={required}><SelectTrigger id={id} className="min-h-11 w-full"><SelectValue placeholder="선택해 주세요" /></SelectTrigger>
      <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}
