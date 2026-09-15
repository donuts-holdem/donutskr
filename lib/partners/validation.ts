import { formText, requireUuid } from "@/lib/membership/validation";
import type { Partner, PartnerFields, PartnerReference } from "@/lib/partners/types";

function externalUrl(value: string, httpsOnly = false) {
  try {
    if (value.length > 2048 || /[\s\p{Cc}\\]/u.test(value) || !/^https?:\/\//i.test(value)) throw new Error();
    const url = new URL(value);
    if (!url.hostname || url.username || url.password || url.href.length > 2048 || (httpsOnly && url.protocol !== "https:")) throw new Error();
    return url.href;
  } catch {
    throw new Error(httpsOnly ? "로고는 HTTPS 이미지 주소를 입력해 주세요." : "인증 정보가 없는 올바른 HTTP 또는 HTTPS 링크를 입력해 주세요.");
  }
}

export function parsePartnerFields(form: FormData): PartnerFields {
  const name = formText(form, "name");
  const description = formText(form, "description");
  if (!name || name.length > 120) throw new Error("파트너 이름을 120자 이내로 입력해 주세요.");
  if (description.length > 4000) throw new Error("소개를 4,000자 이내로 입력해 주세요.");
  const logo = formText(form, "logo_url");
  return { name, description, url: externalUrl(formText(form, "url")), logo_url: logo ? externalUrl(logo, true) : null };
}

export function parsePartnerReference(form: FormData): PartnerReference {
  const id = requireUuid(formText(form, "id"));
  const revision = Number(formText(form, "revision"));
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("새로고침한 뒤 다시 시도해 주세요.");
  return { id, revision };
}

export function parsePartnerOrder(form: FormData): PartnerReference[] {
  try {
    const payload: unknown = JSON.parse(formText(form, "order"));
    if (!Array.isArray(payload) || !payload.length) throw new Error();
    const seen = new Set<string>();
    return payload.map((row: unknown) => {
      if (!row || typeof row !== "object" || !("id" in row) || !("revision" in row)
        || typeof row.id !== "string" || typeof row.revision !== "number"
        || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new Error();
      const id = requireUuid(row.id).toLowerCase();
      if (seen.has(id)) throw new Error();
      seen.add(id);
      return { id, revision: row.revision };
    });
  } catch {
    throw new Error("파트너 목록을 새로고침한 뒤 순서를 변경해 주세요.");
  }
}

export function orderedPartners(partners: Partner[]): Partner[] {
  return [...partners].sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function movePartnerOrder(partners: Partner[], id: string, direction: "up" | "down"): PartnerReference[] {
  const ordered = orderedPartners(partners);
  const index = ordered.findIndex(partner => partner.id === id);
  if (index < 0) throw new Error("파트너 목록을 새로고침해 주세요.");
  const destination = index + (direction === "up" ? -1 : 1);
  if (destination >= 0 && destination < ordered.length) [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
  return ordered.map(({ id: partnerId, revision }) => ({ id: partnerId, revision }));
}
