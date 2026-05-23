-- AlterTable
ALTER TABLE "News" ADD COLUMN     "aiAssets" TEXT[],
ADD COLUMN     "aiImpactScore" DOUBLE PRECISION,
ADD COLUMN     "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiSentiment" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ALTER COLUMN "topics" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "News_aiProcessed_idx" ON "News"("aiProcessed");

-- CreateIndex
CREATE INDEX "News_aiImpactScore_idx" ON "News"("aiImpactScore" DESC);
