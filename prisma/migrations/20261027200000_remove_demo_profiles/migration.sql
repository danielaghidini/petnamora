BEGIN;

-- Remove only profiles explicitly marked as fictitious. Related likes,
-- matches, messages and reports are removed by the existing foreign keys.
DELETE FROM "Dog" WHERE "demo" = true;

-- The former seed account has no known login. Preserve it if it now owns
-- any real profiles rather than deleting those profiles through a cascade.
DELETE FROM "User"
WHERE "email" = 'demo@petnamora.invalid'
  AND NOT EXISTS (SELECT 1 FROM "Dog" WHERE "ownerId" = "User"."id");

DROP INDEX "Dog_active_demo_breed_sex_state_idx";
ALTER TABLE "Dog" DROP COLUMN "demo";
CREATE INDEX "Dog_active_breed_sex_state_idx" ON "Dog"("active", "breed", "sex", "state");

COMMIT;
