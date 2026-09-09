import { Header } from "@/components/site/Header";

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-bg text-ink">
    <Header />
    {children}
  </div>;
}
