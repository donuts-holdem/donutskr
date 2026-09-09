import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const messages: Record<string, string> = {
  forbidden: "이 작업을 처리할 권한이 없습니다.",
  invalid_succession: "종료된 이전 클래스와 아직 시작하지 않은 운영 중 후속 클래스를 선택해 주세요.",
  stale_preview: "미리보기 이후 데이터가 변경되었습니다. 새로고침한 뒤 다시 확인해 주세요.",
  confirmation_required: "대상자와 변경 내용을 확인하고 실행 사유를 입력해 주세요.",
  reason_required: "처리 사유를 입력해 주세요.",
  meeting_closed: "완료·취소된 모임이거나 새 신청을 받지 않는 모임입니다.",
  meeting_membership_required: "이 모임에 신청하려면 주최 클럽의 승인된 소속이 필요합니다. 게스트 허용 모임은 다른 정회원도 신청할 수 있습니다.",
  capacity_below_reservations: "정원은 확정 인원과 제안 중인 예약 자리의 합계보다 작게 줄일 수 없습니다.",
  invalid_meeting: "모임 일정·정원·자리 확정 시간을 확인해 주세요.",
  invalid_club: "운영 중인 클럽을 선택해 주세요.",
  unresolved_meetings: "진행 중인 모임을 완료하거나 취소한 뒤 클럽을 보관해 주세요.",
  original_authorship_required: "도너츠 자체 제작 문항인지 확인하고 제작 근거를 기록해 주세요.",
  invalid_question: "문항·선택지·정답을 확인해 주세요. 선택지 ID는 중복될 수 없습니다.",
  invalid_answer_mode: "단일 정답은 1개, 복수 정답은 2개 이상의 정답이 필요합니다.",
  gto_evidence_required: "GTO 문항에는 솔버·전체 가정·검증 근거·액션 빈도가 필요합니다.",
  review_required: "검수 체크리스트와 검수 의견을 모두 기록해 주세요.",
  already_reviewed: "이미 검수한 버전입니다. 수정하려면 새 버전을 작성해 주세요.",
  invalid_daily_set: "오늘 이후의 날짜와 서로 다른 문항 5개를 선택해 주세요.",
  reviewed_five_required: "검수·게시된 서로 다른 문항 5개가 필요합니다.",
  learning_day_changed: "서울 기준 날짜가 바뀌었습니다. 새로고침하여 오늘의 학습을 시작해 주세요.",
  learning_unavailable: "오늘의 학습 문항이 아직 준비되지 않았습니다.",
  answer_all_five: "5개 문항에 모두 답한 뒤 제출해 주세요.",
  invalid_answer_selection: "정답 선택 방식을 확인해 주세요. 단일 선택 문항에는 하나만 선택할 수 있습니다.",
  member_status_blocked: "이메일 인증을 완료한 활성 정회원만 참여할 수 있습니다.",
};

export async function domainRpc<T>(client: SupabaseClient, name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.code === "23505"
    ? "이미 등록되었거나 처리된 항목입니다. 기존 기록을 확인해 주세요."
    : messages[error.message] ?? "요청을 처리하지 못했습니다. 입력과 권한을 확인한 뒤 다시 시도해 주세요.");
  return data as T;
}

export function actionError(error: unknown) {
  return { error: error instanceof Error && /[가-힣]/.test(error.message)
    ? error.message : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
}

export function refreshDomains() {
  for (const path of ["/home", "/my", "/notifications", "/meetings", "/learn", "/learn/review", "/admin/successors", "/admin/meetings", "/admin/learning", "/admin/notifications"]) revalidatePath(path);
  revalidatePath("/meetings/[id]", "page");
  revalidatePath("/class/[id]", "page");
  revalidatePath("/leader/meetings/[id]", "page");
  revalidatePath("/admin/meetings/[id]", "page");
}
