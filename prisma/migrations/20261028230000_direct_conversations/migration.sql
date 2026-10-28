-- Existing conversations came from reciprocal likes and remain confirmed matches.
-- The default also preserves compatibility with the previous application version.
ALTER TABLE "Match" ADD COLUMN "isMatch" BOOLEAN NOT NULL DEFAULT true;
