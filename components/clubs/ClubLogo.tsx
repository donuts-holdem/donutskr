export function ClubLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (!logoUrl) return <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-card border border-border bg-glass font-semibold text-2xl text-gold">{name.trim().slice(0, 2)}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- Club logos include operator-supplied HTTPS images and retain their uploaded format.
  return <img src={logoUrl} alt={`${name} 로고`} className="size-16 shrink-0 rounded-card border border-border bg-glass object-contain p-2" />;
}
