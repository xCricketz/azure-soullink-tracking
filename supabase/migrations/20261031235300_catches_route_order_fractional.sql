-- Gift slots use fractional orders (place.order + 0.005 and (place + 1) / 100).
-- catches.route_order was integer, so those writes failed with
-- invalid input syntax for type integer: "1.005".
-- Already applied in Supabase as catches_route_order_fractional.
-- Apply in the SQL editor only if this database does not have it yet.
-- Do not run this from the app.

alter table public.catches
  alter column route_order type double precision;
