-- Accent becomes logo yellow. Existing rows are updated explicitly below
-- because a column DEFAULT only affects future inserts.
ALTER TABLE "SiteSettings" ALTER COLUMN "accentColor" SET DEFAULT '#F5CC07';
UPDATE "SiteSettings" SET "accentColor" = '#F5CC07' WHERE "accentColor" = '#5A342D';
