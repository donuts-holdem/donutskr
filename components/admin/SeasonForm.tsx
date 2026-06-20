"use client";

import type { Season, SeasonCode } from "@/lib/types";

interface SeasonFormProps {
  season?: Season;
  action: (fd: FormData) => void | Promise<void>;
}

const SEASON_CODES: { value: SeasonCode; label: string }[] = [
  { value: "spring", label: "봄 (spring)" },
  { value: "summer", label: "여름 (summer)" },
  { value: "autumn", label: "가을 (autumn)" },
  { value: "winter", label: "겨울 (winter)" },
];

const inputClassName = "bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full";

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "4px",
  color: "var(--muted-1)",
};

export function SeasonForm({ season, action }: SeasonFormProps) {
  return (
    <form action={action} style={{ color: "var(--color-ink)" }}>
      <div style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
        {/* 시즌명 */}
        <div>
          <label htmlFor="name" style={labelStyle}>시즌명</label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={season?.name ?? ""}
            required
            className={inputClassName}
          />
        </div>

        {/* 코드 */}
        <div>
          <label htmlFor="code" style={labelStyle}>코드</label>
          <select
            id="code"
            name="code"
            defaultValue={season?.code ?? "spring"}
            className={inputClassName}
          >
            {SEASON_CODES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* 연도 */}
        <div>
          <label htmlFor="year" style={labelStyle}>연도</label>
          <input
            id="year"
            name="year"
            type="number"
            defaultValue={season?.year ?? new Date().getFullYear()}
            required
            className={inputClassName}
          />
        </div>

        {/* 시작일 */}
        <div>
          <label htmlFor="start_date" style={labelStyle}>시작일</label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={season?.start_date ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 종료일 */}
        <div>
          <label htmlFor="end_date" style={labelStyle}>종료일</label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={season?.end_date ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 문구 (tagline / hero_text) */}
        <div>
          <label htmlFor="hero_text" style={labelStyle}>메인 문구</label>
          <input
            id="hero_text"
            name="hero_text"
            type="text"
            defaultValue={season?.hero_text ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 서브 문구 */}
        <div>
          <label htmlFor="sub_text" style={labelStyle}>서브 문구</label>
          <input
            id="sub_text"
            name="sub_text"
            type="text"
            defaultValue={season?.sub_text ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 배지 문구 */}
        <div>
          <label htmlFor="badge_text" style={labelStyle}>배지 문구</label>
          <input
            id="badge_text"
            name="badge_text"
            type="text"
            defaultValue={season?.badge_text ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 이미지 URL */}
        <div>
          <label htmlFor="hero_image" style={labelStyle}>히어로 이미지 URL</label>
          <input
            id="hero_image"
            name="hero_image"
            type="url"
            defaultValue={season?.hero_image ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 배경 이미지 URL */}
        <div>
          <label htmlFor="bg_image" style={labelStyle}>배경 이미지 URL</label>
          <input
            id="bg_image"
            name="bg_image"
            type="url"
            defaultValue={season?.bg_image ?? ""}
            className={inputClassName}
          />
        </div>

        {/* 테마 색상 */}
        <div>
          <label htmlFor="theme_color" style={labelStyle}>테마 색상</label>
          <input
            id="theme_color"
            name="theme_color"
            type="text"
            defaultValue={season?.theme_color ?? ""}
            placeholder="예: #FFE58A"
            className={inputClassName}
          />
        </div>

        {/* 푸터 스폰서 표시 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="footer_sponsor_visible"
            name="footer_sponsor_visible"
            type="checkbox"
            defaultChecked={season?.footer_sponsor_visible ?? false}
          />
          <label htmlFor="footer_sponsor_visible" style={{ color: "var(--muted-1)" }}>푸터 스폰서 표시</label>
        </div>

        <div>
          <button
            type="submit"
            className="text-bg"
            style={{ background: "var(--color-gold)", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer" }}
          >
            저장
          </button>
        </div>
      </div>
    </form>
  );
}
