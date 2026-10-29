ALTER TABLE "Dog" ADD COLUMN "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Dog" SET "photoUrls" = ARRAY["photoUrl"];
