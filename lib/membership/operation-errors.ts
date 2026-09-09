import { databaseErrorMessage } from "@/lib/membership/validation";

const messages: Record<string, string> = {
  invalid_entity: "운영 항목과 입력값을 다시 확인해 주세요.",
  entity_archived: "보관된 항목은 변경할 수 없습니다.",
  entity_closed: "종료된 클래스는 소속 신청을 받을 수 없습니다.",
  stale_operation: "다른 작업으로 정보가 변경되었습니다. 새로고침 후 변경 내용을 다시 확인해 주세요.",
  leader_required: "운영 가능한 리더를 한 명 이상 지정해 주세요.",
  session_dates_required: "실제 날짜와 시간이 있는 회차를 한 개 이상 등록해 주세요.",
  invalid_schedule: "변경할 회차와 날짜·시간을 확인해 주세요.",
  invalid_reason: "변경 사유를 1~500자로 입력해 주세요.",
  invalid_session_transition: "현재 회차 상태에서는 이 작업을 할 수 없습니다. 최신 상태를 확인해 주세요.",
  attendance_locked: "출석 확정을 해제한 뒤 수정해 주세요.",
  attendance_unconfirmed: "미확인 회원의 출석 또는 결석을 모두 표시한 뒤 확정해 주세요.",
  invalid_attendance: "출석 명단이 변경되었거나 입력이 누락되었습니다. 새로고침 후 다시 확인해 주세요.",
  not_affiliated: "승인된 클래스 소속 회원만 출석 명단에 추가할 수 있습니다.",
  start_revert_blocked: "출석을 저장하거나 확정한 뒤에는 시작을 되돌릴 수 없습니다. 출석 정정 또는 회차 취소를 사용해 주세요.",
  class_already_started: "한 번이라도 시작한 클래스의 회차는 삭제 대신 취소해 주세요.",
  final_session_required: "클래스에는 최소 한 개의 회차가 있어야 합니다.",
  class_cannot_extend: "종료 이력이 있는 클래스에는 회차를 추가할 수 없습니다. 후속 클래스가 필요합니다.",
  recovery_admin_only: "종료된 클래스의 미완료 회차 복구는 관리자만 할 수 있습니다.",
  entity_has_history: "신청·소속·운영 이력이 있어 삭제할 수 없습니다. 기록을 보존하는 보관 기능을 사용해 주세요.",
  unfinished_sessions: "남은 회차를 완료·취소하고 출석 정정을 마친 뒤 보관해 주세요.",
  pending_applications: "대기 중인 소속 신청을 먼저 처리한 뒤 보관해 주세요.",
  forbidden: "이 운영 작업을 수행할 권한이 없습니다.",
};

export function operationErrorMessage(error: { code?: string; message: string }) {
  if (messages[error.message]) return messages[error.message];
  if (["23514", "22P02", "22007", "22008", "22003"].includes(error.code ?? "")) return "입력값의 형식이나 범위를 다시 확인해 주세요.";
  if (error.code === "23503") return "연결된 소속이나 기록을 먼저 확인해 주세요. 기록이 있는 항목은 삭제할 수 없습니다.";
  return databaseErrorMessage(error);
}
