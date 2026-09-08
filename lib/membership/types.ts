export type MemberStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN";
export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

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
export interface MembershipApplication {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  requested_class_id: string;
  requested_club_id: string | null;
  requested_school_id: string | null;
  requested_other_school: string | null;
  decision_reason: string | null;
  created_at: string;
}
export interface ReviewApplication extends MembershipApplication {
  member: Pick<MemberProfile, "id" | "name" | "username" | "phone"> | null;
  requested_class: { name: string } | null;
  requested_club: { name: string } | null;
  requested_school: { name: string } | null;
}
export interface FormState { error?: string; success?: string }
