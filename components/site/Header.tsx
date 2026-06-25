import Link from "next/link";

export function Header() {
  return (
    <header className="bg-bg border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center">
        {/* Logo */}
        <Link
          href="/"
          className="text-gold font-bold text-lg tracking-wide shrink-0"
        >
          DO:NUTS
        </Link>
      </div>
    </header>
  );
}
