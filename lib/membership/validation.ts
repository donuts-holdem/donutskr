export function formText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function requireUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("선택한 항목을 다시 확인해 주세요.");
  }
  return value;
}

export function parseEmail(form: FormData) {
  const email = formText(form, "email").toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("올바른 이메일을 입력해 주세요.");
  }
  return email;
}

export function parseNewPassword(form: FormData) {
  const value = form.get("password");
  const password = typeof value === "string" ? value : "";
  if (password.length < 10 || new TextEncoder().encode(password).length > 72) {
    throw new Error("비밀번호는 10자 이상, 72바이트 이하로 입력해 주세요.");
  }
  if (password !== form.get("password_confirm")) throw new Error("비밀번호 확인이 일치하지 않습니다.");
  return password;
}

export function parseApplication(form: FormData) {
  const name = formText(form, "name");
  const phone = formText(form, "phone").replace(/[\s()-]/g, "");
  if (!name || name.length > 80) throw new Error("이름을 80자 이내로 입력해 주세요.");
  if (!/^\+?[0-9]{8,15}$/.test(phone)) throw new Error("연락 가능한 전화번호를 입력해 주세요.");
  const school = formText(form, "school_id");
  const otherSchool = formText(form, "other_school_name");
  if (school === "other" && (!otherSchool || otherSchool.length > 120)) {
    throw new Error("기타 학교명을 120자 이내로 입력해 주세요.");
  }
  if (form.get("consent") !== "on") throw new Error("개인정보 수집 안내를 확인하고 동의해 주세요.");
  const club = formText(form, "club_id");
  return {
    name, phone,
    school_id: school === "other" ? null : requireUuid(school),
    other_school_name: school === "other" ? otherSchool : null,
    class_id: requireUuid(formText(form, "class_id")),
    club_id: club === "none" ? null : requireUuid(club),
    consent: true,
    consent_version: formText(form, "consent_version"),
  };
}

const databaseMessages: Record<string, string> = {
  membership_closed: "현재 가입 신청을 받지 않고 있습니다.",
  terms_changed: "개인정보 안내가 변경되었습니다. 새로고침한 뒤 다시 동의해 주세요.",
  invalid_class: "신청 가능한 클래스를 다시 선택해 주세요.",
  invalid_school: "학교 정보를 다시 확인해 주세요.",
  invalid_club: "신청 가능한 동아리를 다시 선택해 주세요.",
  duplicate_pending: "이미 승인 대기 중인 신청이 있습니다. 승인 상태를 확인해 주세요.",
  member_status_blocked: "현재 회원 상태에서는 이 작업을 할 수 없습니다.",
  email_not_verified: "가입 이메일 인증을 먼저 완료해 주세요.",
  admin_account: "운영자 계정과 회원 계정은 별도로 사용해 주세요.",
  forbidden: "이 신청을 처리할 권한이 없습니다.",
  unauthorized: "다시 로그인해 주세요.",
  self_approval_forbidden: "본인의 신청은 승인할 수 없습니다.",
  already_reviewed: "이미 처리된 신청입니다. 목록을 새로고침해 주세요.",
  invalid_decision: "반려 사유를 500자 이내로 입력해 주세요.",
  request_not_found: "신청을 찾을 수 없거나 조회 권한이 없습니다.",
  profile_already_exists: "이미 가입한 회원입니다. 클래스·클럽 목록에서 소속을 신청해 주세요.",
  already_affiliated: "이미 승인된 소속입니다.",
  invalid_affiliation_kind: "클래스 또는 클럽을 선택해 주세요.",
  invalid_leader_type: "리더의 담당 영역을 확인해 주세요.",
  last_leader_requires_replacement: "마지막 리더입니다. 후임 리더를 먼저 지정한 뒤 해제해 주세요.",
  invalid_status_reason: "상태 변경 사유를 500자 이내로 입력해 주세요.",
  separate_affiliation_approval_required: "클래스와 클럽은 각각 승인해야 합니다. 목록을 새로고침해 주세요.",
};

export function databaseErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "이미 등록된 정보입니다. 입력 내용을 확인해 주세요.";
  return databaseMessages[error.message] ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
