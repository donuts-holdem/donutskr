-- Drop the unused `code` column from seasons.
--
-- The season "code" (season_code enum: spring/summer/autumn/winter) was only ever
-- an admin-facing label. Nothing on the public site or in any logic read it, so
-- it is removed from the form, the app code, and now the schema. The enum type is
-- dropped too once its only column is gone.
alter table seasons drop column if exists code;
drop type if exists season_code;
