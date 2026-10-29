CREATE TABLE "PhotoDeletion" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhotoDeletion_url_key" ON "PhotoDeletion"("url");
