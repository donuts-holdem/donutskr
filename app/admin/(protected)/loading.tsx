// Generic admin loading fallback — shown while a route's server data is
// fetched (the dashboard fires several parallel queries; edit pages await
// their entity). Neutral shimmer shells so the operator sees structure, not
// a blank frame. Server Component (no client JS needed for a skeleton).
export default function AdminLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중…</span>
      {/* Heading shell */}
      <div className="bg-muted mb-6 h-8 w-48 rounded-md" />
      {/* Card / row shells */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-border bg-card rounded-md border p-4">
            <div className="bg-muted h-4 w-1/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
