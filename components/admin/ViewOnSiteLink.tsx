import { ExternalLink } from "lucide-react";

export function ViewOnSiteLink({ href, label = "사이트에서 보기" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
    >
      <ExternalLink className="size-3" aria-hidden />
      {label}
    </a>
  );
}
