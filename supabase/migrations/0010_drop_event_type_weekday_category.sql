-- Drop redundant/unused event columns: event_type, weekday, category.
--
-- - event_type: free-text format label, null for every event → unused.
-- - weekday: derivable from `date`; now computed at render (weekdayKO) instead of
--   stored, removing drift risk.
-- - category: duplicated `status` semantically; its only reader (home board) now
--   filters on status alone. Its enum type is dropped with it.
--
-- NOTE: programs.category is a DIFFERENT column and is untouched.
alter table events drop column if exists event_type;
alter table events drop column if exists weekday;
alter table events drop column if exists category;
drop type if exists event_category;
