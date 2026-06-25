-- AlterTable
ALTER TABLE "access_logs" ADD COLUMN     "entryLogId" TEXT;

-- CreateIndex
CREATE INDEX "access_logs_entryLogId_idx" ON "access_logs"("entryLogId");

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_entryLogId_fkey" FOREIGN KEY ("entryLogId") REFERENCES "access_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
