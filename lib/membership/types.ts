export type MemberStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN";
export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AffiliationKind = "CLASS" | "CLUB";

export interface MemberProfile {
  id: string;
  username: string;
  name: string;
  phone: string;
  school_id: string | null;
  other_school_name: string | null;
  status: MemberStatus;
  consented_at: string;
  consent_version: string;
  created_at: string;
}

export interface School { id: string; name: string; active: boolean }
export interface MembershipClass {
  id: string;
  name: string;
  place: string;
  weekday: number;
  start_time: string;
}
export interface MembershipClub { id: string; name: string; school_id: string }
export interface MembershipSettings {
  signup_open: boolean;
  consent_version: string | null;
  privacy_url: string | null;
}
export interface SignupCatalog {
  schools: School[];
  classes: MembershipClass[];
  clubs: MembershipClub[];
  settings: MembershipSettings;
}
export interface AffiliationRequest {
  id: string;
  user_id: string;
  kind: AffiliationKind;
  status: ApplicationStatus;
  class_id: string | null;
  club_id: string | null;
  decision_reason: string | null;
  created_at: string;
}
export interface ReviewApplication extends AffiliationRequest {
  member: (Pick<MemberProfile, "id" | "name" | "username" | "phone" | "status" | "other_school_name"> & {
    school: { name: string } | null;
  }) | null;
  requested_class: { name: string } | null;
  requested_club: { name: string } | null;
}
export interface FormState { error?: string; success?: string }

export interface LeaderCandidate { id: string; label: string; is_admin: boolean }
export interface EntityPeople {
  leaders: { id: string; label: string; eligible: boolean }[];
  members: { id: string; name: string; username: string; status: MemberStatus; active: boolean; joined_at: string }[];
}
export interface EntityOperation {
  id: string;
  action: string;
  actor_id: string;
  reason: string | null;
  before_state: unknown;
  after_state: unknown;
  created_at: string;
}
