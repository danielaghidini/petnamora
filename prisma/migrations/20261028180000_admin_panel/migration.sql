CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Dog" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
CREATE TABLE "AdminAction" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
