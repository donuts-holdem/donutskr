import { getOnlineLeague } from "@/lib/data/onlineLeague";
import { updateOnlineLeague } from "@/app/admin/actions/onlineLeague";

const inputCls = "bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full";
const labelCls = { display: "block", marginBottom: "4px", color: "var(--muted-1)", fontSize: "0.875rem" } as const;

export default async function OnlineLeaguePage() {
  const league = await getOnlineLeague();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>온라인 리그 설정</h1>
      <form action={updateOnlineLeague} style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
        <div>
          <label style={labelCls}>상태</label>
          <select name="status" defaultValue={league.status} className={inputCls}>
            <option value="operating">operating</option>
            <option value="revamping">revamping</option>
            <option value="preparing">preparing</option>
            <option value="suspended">suspended</option>
            <option value="hidden">hidden</option>
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="tab_visible" type="checkbox" defaultChecked={league.tab_visible} />
          탭 노출
        </label>
        <div>
          <label style={labelCls}>제목</label>
          <input name="title" type="text" defaultValue={league.title ?? ""} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>설명</label>
          <textarea name="description" defaultValue={league.description ?? ""} rows={3} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>가입 안내</label>
          <textarea name="join_guide" defaultValue={league.join_guide ?? ""} rows={3} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>스텝 (JSON 배열, 예: ["1단계","2단계"])</label>
          <textarea name="steps" defaultValue={JSON.stringify(league.steps)} rows={3} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>링크 (JSON 객체, 예: {`{"카카오":"url"}`})</label>
          <textarea name="links" defaultValue={JSON.stringify(league.links)} rows={3} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>오늘의 리그 (JSON 배열)</label>
          <textarea name="today_leagues" defaultValue={JSON.stringify(league.today_leagues)} rows={4} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>공지 텍스트</label>
          <textarea name="notice_text" defaultValue={league.notice_text ?? ""} rows={2} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>CTA 레이블</label>
          <input name="cta_label" type="text" defaultValue={league.cta_label ?? ""} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>CTA URL</label>
          <input name="cta_url" type="text" defaultValue={league.cta_url ?? ""} className={inputCls} />
        </div>
        <div>
          <label style={labelCls}>시트 URL</label>
          <input name="sheet_url" type="text" defaultValue={league.sheet_url ?? ""} className={inputCls} />
        </div>
        <button type="submit" style={{ background: "var(--color-gold)", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem" }} className="text-bg">
          저장
        </button>
      </form>
    </div>
  );
}
