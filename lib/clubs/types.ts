export interface ClubRecord {
  id: string;
  name: string;
  school_id: string;
  description: string;
  logo_url: string | null;
  default_atc: number | null;
  archived_at: string | null;
  revision: number;
  created_at: string;
}
