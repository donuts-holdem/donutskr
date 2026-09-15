export type Partner = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  url: string;
  sort_order: number;
  revision: number;
};

export type PartnerFields = Pick<Partner, "name" | "description" | "logo_url" | "url">;
export type PartnerReference = Pick<Partner, "id" | "revision">;
