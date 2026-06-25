"use client";
import type { SpecialPage, BlindStructure } from "@/lib/types";

interface SpecialPageFormProps {
  page?: SpecialPage;
  structures?: BlindStructure[];
  action: (fd: FormData) => void | Promise<void>;
}

const inputCls = "bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full";
const labelCls = { display: "block", marginBottom: "4px", color: "var(--muted-1)", fontSize: "0.875rem" };

export function SpecialPageForm({ page, structures = [], action }: SpecialPageFormProps) {
  return (
    <form action={action} style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
      <div>
        <label style={labelCls}>슬러그 (slug) *</label>
        <input name="slug" type="text" defaultValue={page?.slug ?? ""} required className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>레이블</label>
        <input name="label" type="text" defaultValue={page?.label ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>제목 *</label>
        <input name="title" type="text" defaultValue={page?.title ?? ""} required className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>설명</label>
        <textarea name="description" defaultValue={page?.description ?? ""} rows={3} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>날짜</label>
        <input name="date" type="date" defaultValue={page?.date ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>장소</label>
        <input name="venue" type="text" defaultValue={page?.venue ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>주소</label>
        <input name="address" type="text" defaultValue={page?.address ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>시작 시간</label>
        <input name="start_time" type="text" defaultValue={page?.start_time ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>참가 링크</label>
        <input name="entry_link" type="text" defaultValue={page?.entry_link ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>CTA 레이블</label>
        <input name="cta_label" type="text" defaultValue={page?.cta_label ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>스폰서명</label>
        <input name="sponsor_name" type="text" defaultValue={page?.sponsor_name ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>스폰서 로고</label>
        {page?.sponsor_logo && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted-1)", marginBottom: "4px", wordBreak: "break-all" }}>{page.sponsor_logo}</p>
        )}
        {page && <input type="hidden" name="sponsor_logo_existing" value={page.sponsor_logo ?? ""} />}
        <input name="sponsor_logo_file" type="file" accept="image/*" className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>포스터</label>
        {page?.poster && (
          <p style={{ fontSize: "0.75rem", color: "var(--muted-1)", marginBottom: "4px", wordBreak: "break-all" }}>{page.poster}</p>
        )}
        {page && <input type="hidden" name="poster_existing" value={page.poster ?? ""} />}
        <input name="poster_file" type="file" accept="image/*" className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>갤러리 (JSON 배열, 예: ["url1","url2"])</label>
        <textarea name="gallery" defaultValue={JSON.stringify(page?.gallery ?? [])} rows={3} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>정보 카드 (JSON 배열, 예: [{`{"label":"","value":""}`}])</label>
        <textarea name="info_cards" defaultValue={JSON.stringify(page?.info_cards ?? [])} rows={3} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>노트 목록 (JSON 배열, 예: ["항목1","항목2"])</label>
        <textarea name="note_list" defaultValue={JSON.stringify(page?.note_list ?? [])} rows={3} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>블라인드 스트럭처</label>
        <select name="blind_structure_id" defaultValue={page?.blind_structure_id ?? ""} className={inputCls}>
          <option value="">-- 없음 --</option>
          {structures.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelCls}>노출 시작일</label>
        <input name="start_show_date" type="date" defaultValue={page?.start_show_date ?? ""} className={inputCls} />
      </div>
      <div>
        <label style={labelCls}>노출 종료일</label>
        <input name="end_show_date" type="date" defaultValue={page?.end_show_date ?? ""} className={inputCls} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
        <input name="is_visible" type="checkbox" defaultChecked={page?.is_visible ?? true} />
        노출
      </label>
      <button type="submit" style={{ background: "var(--color-gold)", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem" }} className="text-bg">
        저장
      </button>
    </form>
  );
}
