-- The wall in the room gets longer: 15 frames instead of 5 (founder, Nov 2026).
-- A house still holds 30 photos in all; this only changes how many may hang on the wall.
-- Slots 0-4 keep their places, so photos already hanging don't move.
-- The frames themselves are in src/inside/frames.js.

alter table public.photos drop constraint photos_slot_in_room;
alter table public.photos add constraint photos_slot_in_room check (slot between 0 and 14);
