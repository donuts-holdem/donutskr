"use client";

import type { Program } from "@/lib/types";

interface ProgramFormProps {
  program?: Program;
  action: (fd: FormData) => void | Promise<void>;
}

export function ProgramForm({ program, action }: ProgramFormProps) {
  return (
    <form action={action} style={{ color: "var(--color-ink)" }}>
      <div style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>

        {/* 프로그램명 */}
        <div>
          <label htmlFor="title" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>프로그램명</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={program?.title ?? ""}
            required
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 슬러그 */}
        <div>
          <label htmlFor="slug" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>슬러그</label>
          <input
            id="slug"
            name="slug"
            type="text"
            defaultValue={program?.slug ?? ""}
            required
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label htmlFor="category" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>카테고리</label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={program?.category ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 그룹 */}
        <div>
          <label htmlFor="program_group" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>그룹</label>
          <select
            id="program_group"
            name="program_group"
            defaultValue={program?.program_group ?? "poker"}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          >
            <option value="poker">poker</option>
            <option value="social">social</option>
            <option value="others">others</option>
          </select>
        </div>

        {/* 상태 */}
        <div>
          <label htmlFor="status" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>상태</label>
          <input
            id="status"
            name="status"
            type="text"
            defaultValue={program?.status ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 인원 */}
        <div>
          <label htmlFor="member_count" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>인원</label>
          <input
            id="member_count"
            name="member_count"
            type="number"
            defaultValue={program?.member_count ?? 0}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 지역 */}
        <div>
          <label htmlFor="location" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>지역</label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={program?.location ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 시작일 */}
        <div>
          <label htmlFor="start_date" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>시작일</label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={program?.start_date ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 종료일 */}
        <div>
          <label htmlFor="end_date" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>종료일</label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={program?.end_date ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>설명</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={program?.description ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 커버 이미지 */}
        <div>
          <label htmlFor="cover_image_file" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>커버 이미지</label>
          {program?.cover_image && (
            <p style={{ fontSize: "0.75rem", color: "var(--muted-1)", marginBottom: "4px", wordBreak: "break-all" }}>{program.cover_image}</p>
          )}
          {program && <input type="hidden" name="cover_image_existing" value={program.cover_image ?? ""} />}
          <input
            id="cover_image_file"
            name="cover_image_file"
            type="file"
            accept="image/*"
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 담당자명 */}
        <div>
          <label htmlFor="manager_name" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>담당자명</label>
          <input
            id="manager_name"
            name="manager_name"
            type="text"
            defaultValue={program?.manager_name ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 담당자 역할 */}
        <div>
          <label htmlFor="manager_role" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>담당자 역할</label>
          <input
            id="manager_role"
            name="manager_role"
            type="text"
            defaultValue={program?.manager_role ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 담당자 아바타 */}
        <div>
          <label htmlFor="manager_avatar" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>담당자 아바타</label>
          <input
            id="manager_avatar"
            name="manager_avatar"
            type="text"
            defaultValue={program?.manager_avatar ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* CTA 문구 */}
        <div>
          <label htmlFor="cta_label" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>CTA 문구</label>
          <input
            id="cta_label"
            name="cta_label"
            type="text"
            defaultValue={program?.cta_label ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 참가 링크 */}
        <div>
          <label htmlFor="entry_link" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>참가 링크</label>
          <input
            id="entry_link"
            name="entry_link"
            type="url"
            defaultValue={program?.entry_link ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* 외부 링크 */}
        <div>
          <label htmlFor="external_url" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>외부 링크</label>
          <input
            id="external_url"
            name="external_url"
            type="url"
            defaultValue={program?.external_url ?? ""}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
        </div>

        {/* HOT */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="is_hot"
            name="is_hot"
            type="checkbox"
            defaultChecked={program?.is_hot ?? false}
          />
          <label htmlFor="is_hot" style={{ color: "var(--muted-1)" }}>HOT</label>
        </div>

        {/* 제휴 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="is_affiliate"
            name="is_affiliate"
            type="checkbox"
            defaultChecked={program?.is_affiliate ?? false}
          />
          <label htmlFor="is_affiliate" style={{ color: "var(--muted-1)" }}>제휴</label>
        </div>

        {/* 노출 여부 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="is_visible"
            name="is_visible"
            type="checkbox"
            defaultChecked={program?.is_visible ?? true}
          />
          <label htmlFor="is_visible" style={{ color: "var(--muted-1)" }}>노출</label>
        </div>

        {/* 노출 순서 */}
        <div>
          <label htmlFor="sort_order" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>순서</label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={program?.sort_order ?? 0}
            className="bg-white/[0.08] border border-white/15 text-ink rounded-[6px] px-[10px] py-[6px] w-full"
          />
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
