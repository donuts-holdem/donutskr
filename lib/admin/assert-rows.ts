// A Supabase `.update()` that matches 0 rows returns NO error: after migration
// 0017 (admin RLS) an operator who passes requireAdmin() but is missing from the
// admin_emails table gets their update filtered by RLS to 0 rows, so the write
// silently no-ops while the action still redirects to ?saved=1 (false success).
//
// Chain `.select("id")` (or any minimal column) onto such an update and pass the
// returned rows here so those no-op saves fail loudly instead. Inserts already
// fail loudly, so this only guards updates. Keep the existing `if (error) throw
// error` check before calling this — it only covers the zero-rows case.
export function assertRowsAffected(rows: unknown[] | null | undefined): void {
  if (!rows || rows.length === 0) {
    throw new Error("수정된 행이 없습니다 (권한 또는 대상 확인)");
  }
}
