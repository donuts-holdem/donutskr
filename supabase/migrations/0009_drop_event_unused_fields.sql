-- Drop unused event columns: round, end_time, sponsor_logo.
--
-- Audit found these were editable in the admin form and stored, but never read
-- for display or logic anywhere (round's detail-page badge is removed in the same
-- change). They are dropped from the form, app code, and schema.
--
-- NOTE: special_pages.sponsor_logo is a DIFFERENT table/column and is still used —
-- this drops ONLY the events columns.
alter table events drop column if exists round;
alter table events drop column if exists end_time;
alter table events drop column if exists sponsor_logo;
