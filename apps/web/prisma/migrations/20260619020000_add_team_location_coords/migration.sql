-- Geocoded lat/lng for team ZIP. More accurate than state centroid for ordering
-- regional fairs (especially in large/dense states). Set at onboarding and when
-- the team updates their location via /api/team/location.
ALTER TABLE "teams" ADD COLUMN "location_lat" DOUBLE PRECISION;
ALTER TABLE "teams" ADD COLUMN "location_lng" DOUBLE PRECISION;
