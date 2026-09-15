import "server-only";
import { requireAdmin } from "@/lib/auth";
import { allRows } from "@/lib/membership/operations";
import { requireUuid } from "@/lib/membership/validation";
import type { MemberStatus } from "@/lib/membership/types";

export const memberStatusLabels: Record<MemberStatus,string>={PENDING:"인증 대기",ACTIVE:"정회원",SUSPENDED:"이용 정지",WITHDRAWN:"탈퇴"};
export interface DirectoryMember {
  id:string;name:string;email:string;phone:string;school_id:string|null;school_name:string;other_school_name:string|null;status:MemberStatus;revision:number;
  withdrawal_status:"AUTH_PENDING"|"COMPLETE"|null;
  classes:{id:string;name:string;active:boolean}[];clubs:{id:string;name:string;active:boolean}[];
  leaders:{id:string;kind:"CLASS"|"CLUB";name:string}[];
}
export interface DirectoryFilters {q?:string;status?:string;school_id?:string;class_id?:string;club_id?:string;page?:string;user_id?:string}
export interface MemberAdminCatalog {
  schools: { id: string; name: string; active: boolean }[];
  classes: { id: string; name: string; active: boolean; closed_at: string | null; archived_at: string | null }[];
  clubs: { id: string; name: string; archived_at: string | null }[];
}
export function directoryFilters(input:DirectoryFilters) {
  const filters:Record<string,string|number>={q:(input.q??"").trim().slice(0,80),status:Object.hasOwn(memberStatusLabels,input.status??"")?input.status!:"ALL",page:Math.max(1,Math.min(10000,Number(input.page)||1))};
  for(const field of ["user_id","school_id","class_id","club_id"] as const)if(input[field]){try{filters[field]=requireUuid(input[field]!);}catch{/* Ignore malformed query filters. */}}
  filters.page=Math.floor(Number(filters.page));return filters;
}
export async function getMemberDirectory(input:DirectoryFilters) {
  const client=await requireAdmin();const filters=directoryFilters(input);const {data,error}=await client.rpc("admin_member_directory",{p_filters:filters});
  if(error)throw new Error("회원 목록을 불러오지 못했습니다.");
  return {...data,filters} as {members:DirectoryMember[];count:number;page:number;filters:Record<string,string|number>};
}
export async function getMemberAdminCatalog(): Promise<MemberAdminCatalog> {
  const client = await requireAdmin();
  const [schools, classes, clubs] = await Promise.all([
    allRows<MemberAdminCatalog["schools"][number]>((from, to) => client.from("schools").select("id,name,active").order("name").order("id").range(from, to), "학교 목록을 불러오지 못했습니다."),
    allRows<MemberAdminCatalog["classes"][number]>((from, to) => client.from("classes").select("id,name,active,closed_at,archived_at").order("name").order("id").range(from, to), "클래스 목록을 불러오지 못했습니다."),
    allRows<MemberAdminCatalog["clubs"][number]>((from, to) => client.from("clubs").select("id,name,archived_at").order("name").order("id").range(from, to), "클럽 목록을 불러오지 못했습니다."),
  ]);
  return { schools, classes, clubs };
}
