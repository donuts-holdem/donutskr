import { formText } from "@/lib/membership/validation";

export function requiredText(form: FormData, key: string, max = 4000) {
  const value = formText(form, key);
  if (!value || value.length > max) throw new Error("필수 입력 내용을 확인해 주세요.");
  return value;
}
export function positiveInteger(form: FormData, key: string, fallback?: number) {
  const value = formText(form, key);
  if (!value && fallback !== undefined) return fallback;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new Error("1 이상의 정수를 입력해 주세요.");
  return Number(value);
}
export function confirmAction(form: FormData) {
  if (form.get("confirm") !== "on") throw new Error("변경 내용을 확인한 뒤 확인란을 선택해 주세요.");
}
export function calendarDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error("올바른 날짜를 입력해 주세요.");
  return value;
}
export function parseChoiceLines(text: string) {
  const labels = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return labels.map((label, index) => ({ id: "option-" + (index + 1), text: label }));
}
