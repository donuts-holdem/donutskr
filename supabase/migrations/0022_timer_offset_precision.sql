-- Sub-second precision for the clock anchor. Integer seconds forced every
-- fold (pause, adjust, level advance) to truncate the in-flight fraction:
-- each cycle under-counted elapsed time by up to 1s (the tournament ran long)
-- and the reconciled value snapped the venue display onto a whole-second grid
-- that rarely matched the optimistic overlay, causing visible ±1s jumps.
alter table public.timer_sessions
  alter column elapsed_offset_sec type double precision
  using elapsed_offset_sec::double precision;
