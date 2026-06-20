"use client";
import type { NavTab } from "@/lib/types";

interface TabFormProps {
  tab?: NavTab;
  action: (fd: FormData) => void | Promise<void>;
}

const inputCls = "bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full";
const labelCls = { display: "block", marginBottom: "4px", color: "var(--muted-1)", fontSize: "0.875rem" };

export function TabForm({ tab, action }: TabFormProps) {
  return (
    <form action={action} style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
      <div>
        <label style={labelCls}>이름</label>
        <input name="name" type="text" defaultValue={tab?.name ?? ""} required className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>키 (key)</label>
        <input name="key" type="text" defaultValue={tab?.key ?? ""} required className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>타입</label>
        <select name="type" defaultValue={tab?.type ?? "internal"} className={inputCls}>
          <option value="internal">internal</option>
          <option value="external">external</option>
          <option value="special">special</option>
        </select>
      </div>
      <div>
        <label style={labelCls}>슬러그 (slug)</label>
        <input name="slug" type="text" defaultValue={tab?.slug ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>외부 URL</label>
        <input name="external_url" type="text" defaultValue={tab?.external_url ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>순서</label>
        <input name="sort_order" type="number" defaultValue={tab?.sort_order ?? 0} className={inputCls} />
      </div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="is_visible" type="checkbox" defaultChecked={tab?.is_visible ?? true} />
          노출
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="mobile_visible" type="checkbox" defaultChecked={tab?.mobile_visible ?? true} />
          모바일 노출
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="home_card_visible" type="checkbox" defaultChecked={tab?.home_card_visible ?? false} />
          홈카드 노출
        </label>
      </div>
      <div>
        <label style={labelCls}>기간 노출 시작일</label>
        <input name="start_show_date" type="date" defaultValue={tab?.start_show_date ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>기간 노출 종료일</label>
        <input name="end_show_date" type="date" defaultValue={tab?.end_show_date ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>홈카드 제목</label>
        <input name="home_card_title" type="text" defaultValue={tab?.home_card_title ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>홈카드 설명</label>
        <input name="home_card_desc" type="text" defaultValue={tab?.home_card_desc ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>홈카드 CTA</label>
        <input name="home_card_cta" type="text" defaultValue={tab?.home_card_cta ?? ""} className={inputCls} />
      </div>
      <button type="submit" style={{ background: "var(--color-gold)", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem" }} className="text-bg">
        저장
      </button>
    </form>
  );
}
