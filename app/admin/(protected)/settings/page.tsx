import { getSiteConfig } from "@/lib/data/siteConfig";
import { updateSiteConfig } from "@/app/admin/actions/siteConfig";

const inputCls = "bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full";
const labelCls = { display: "block", marginBottom: "4px", color: "var(--muted-1)", fontSize: "0.875rem" } as const;

export default async function SettingsPage() {
  const config = await getSiteConfig();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-gold)" }}>사이트 설정</h1>
      <form action={updateSiteConfig} style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--muted-1)" }}>가입신청</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="signup_visible" type="checkbox" defaultChecked={config.signup_visible} />
          가입신청 노출
        </label>
        <div>
          <label style={labelCls}>가입신청 링크</label>
          <input name="signup_link" type="text" defaultValue={config.signup_link ?? ""} className={inputCls} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="signup_new_tab" type="checkbox" defaultChecked={config.signup_new_tab} />
          새탭에서 열기
        </label>
        <div>
          <label style={labelCls}>버튼 레이블</label>
          <input name="signup_button_label" type="text" defaultValue={config.signup_button_label ?? ""} className={inputCls} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="signup_closed" type="checkbox" defaultChecked={config.signup_closed} />
          가입 마감
        </label>
        <div>
          <label style={labelCls}>마감 안내 텍스트</label>
          <input name="signup_closed_text" type="text" defaultValue={config.signup_closed_text ?? ""} className={inputCls} />
        </div>

        <h2 className="text-lg font-semibold" style={{ color: "var(--muted-1)" }}>리더보드</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="leaderboard_tab_visible" type="checkbox" defaultChecked={config.leaderboard_tab_visible} />
          리더보드 탭 노출
        </label>
        <div>
          <label style={labelCls}>리더보드 API URL</label>
          <input name="leaderboard_api_url" type="text" defaultValue={config.leaderboard_api_url ?? ""} className={inputCls} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--muted-1)", fontSize: "0.875rem" }}>
          <input name="leaderboard_personal_rank_visible" type="checkbox" defaultChecked={config.leaderboard_personal_rank_visible} />
          개인 랭킹 노출
        </label>

        <h2 className="text-lg font-semibold" style={{ color: "var(--muted-1)" }}>푸터 스폰서</h2>
        <div>
          <label style={labelCls}>스폰서 목록 (JSON 배열, 예: [{`{"name":"","logo":""}`}])</label>
          <textarea name="footer_sponsors" defaultValue={JSON.stringify(config.footer_sponsors)} rows={4} className={inputCls} />
        </div>

        <button type="submit" style={{ background: "var(--color-gold)", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer", fontSize: "0.875rem" }} className="text-bg">
          저장
        </button>
      </form>
    </div>
  );
}
