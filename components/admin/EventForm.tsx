"use client";

import type { Event, BlindStructure, Season, EventCategory, EventStatus } from "@/lib/types";

interface EventFormProps {
  event?: Event;
  structures: BlindStructure[];
  seasons?: Season[];
  action: (fd: FormData) => void | Promise<void>;
}

export function EventForm({ event, structures, seasons = [], action }: EventFormProps) {
  return (
    <form action={action} style={{ color: "var(--color-ink)" }}>
      <div style={{ display: "grid", gap: "1rem", maxWidth: "640px" }}>
        {/* 시즌 */}
        <div>
          <label htmlFor="season_id" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>시즌</label>
          <select
            id="season_id"
            name="season_id"
            defaultValue={event?.season_id ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          >
            <option value="">-- 선택 --</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
            ))}
          </select>
        </div>

        {/* 이벤트명 */}
        <div>
          <label htmlFor="title" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>이벤트명</label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={event?.title ?? ""}
            required
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 회차 */}
        <div>
          <label htmlFor="round" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>회차</label>
          <input
            id="round"
            name="round"
            type="text"
            defaultValue={event?.round ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 이벤트 타입 */}
        <div>
          <label htmlFor="event_type" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>이벤트 타입</label>
          <input
            id="event_type"
            name="event_type"
            type="text"
            defaultValue={event?.event_type ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label htmlFor="category" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>카테고리</label>
          <select
            id="category"
            name="category"
            defaultValue={event?.category ?? "upcoming"}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          >
            <option value="festival">festival</option>
            <option value="confirmed">confirmed</option>
            <option value="upcoming">upcoming</option>
            <option value="completed">completed</option>
          </select>
        </div>

        {/* 상태 */}
        <div>
          <label htmlFor="status" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>상태</label>
          <select
            id="status"
            name="status"
            defaultValue={event?.status ?? "scheduled"}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          >
            <option value="scheduled">scheduled</option>
            <option value="confirmed">confirmed</option>
            <option value="running">running</option>
            <option value="reg_closed">reg_closed</option>
            <option value="completed">completed</option>
            <option value="canceled">canceled</option>
            <option value="hidden">hidden</option>
          </select>
        </div>

        {/* 날짜 */}
        <div>
          <label htmlFor="date" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>날짜</label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={event?.date ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 요일 */}
        <div>
          <label htmlFor="weekday" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>요일</label>
          <input
            id="weekday"
            name="weekday"
            type="text"
            defaultValue={event?.weekday ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 장소 */}
        <div>
          <label htmlFor="location" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>장소</label>
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={event?.location ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 주소 */}
        <div>
          <label htmlFor="address" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>주소</label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={event?.address ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 시작 시간 */}
        <div>
          <label htmlFor="start_time" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>시작 시간</label>
          <input
            id="start_time"
            name="start_time"
            type="text"
            defaultValue={event?.start_time ?? ""}
            placeholder="예: 14:00"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 레지 마감 시간 */}
        <div>
          <label htmlFor="reg_close_time" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>레지 마감 시간</label>
          <input
            id="reg_close_time"
            name="reg_close_time"
            type="text"
            defaultValue={event?.reg_close_time ?? ""}
            placeholder="예: 16:00"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 종료 시간 */}
        <div>
          <label htmlFor="end_time" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>종료 시간</label>
          <input
            id="end_time"
            name="end_time"
            type="text"
            defaultValue={event?.end_time ?? ""}
            placeholder="예: 22:00"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 참가비 */}
        <div>
          <label htmlFor="buy_in" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>참가비</label>
          <input
            id="buy_in"
            name="buy_in"
            type="text"
            defaultValue={event?.buy_in ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 참가 링크 */}
        <div>
          <label htmlFor="entry_link" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>참가 링크</label>
          <input
            id="entry_link"
            name="entry_link"
            type="url"
            defaultValue={event?.entry_link ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 버튼 문구 */}
        <div>
          <label htmlFor="button_label" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>버튼 문구</label>
          <input
            id="button_label"
            name="button_label"
            type="text"
            defaultValue={event?.button_label ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 설명 */}
        <div>
          <label htmlFor="description" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>설명</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={event?.description ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 블라인드 스트럭처 */}
        <div>
          <label htmlFor="blind_structure_id" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>블라인드 스트럭처</label>
          <select
            id="blind_structure_id"
            name="blind_structure_id"
            defaultValue={event?.blind_structure_id ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          >
            <option value="">-- 선택 --</option>
            {structures.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 타이머 이벤트 ID */}
        <div>
          <label htmlFor="timer_event_id" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>타이머 이벤트 ID</label>
          <input
            id="timer_event_id"
            name="timer_event_id"
            type="text"
            defaultValue={event?.timer_event_id ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 타이머 URL */}
        <div>
          <label htmlFor="timer_event_url" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>타이머 URL</label>
          <input
            id="timer_event_url"
            name="timer_event_url"
            type="url"
            defaultValue={event?.timer_event_url ?? ""}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        {/* 노출 여부 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            id="is_visible"
            name="is_visible"
            type="checkbox"
            defaultChecked={event?.is_visible ?? true}
          />
          <label htmlFor="is_visible" style={{ color: "var(--muted-1)" }}>노출 여부</label>
        </div>

        {/* 노출 순서 */}
        <div>
          <label htmlFor="sort_order" style={{ display: "block", marginBottom: "4px", color: "var(--muted-1)" }}>노출 순서</label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={event?.sort_order ?? 0}
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-ink)", borderRadius: "6px", padding: "6px 10px", width: "100%" }}
          />
        </div>

        <div>
          <button
            type="submit"
            style={{ background: "var(--color-gold)", color: "#000", padding: "8px 20px", borderRadius: "6px", fontWeight: "600", border: "none", cursor: "pointer" }}
          >
            저장
          </button>
        </div>
      </div>
    </form>
  );
}
