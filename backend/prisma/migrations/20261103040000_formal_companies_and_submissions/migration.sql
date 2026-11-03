-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "hasDemoProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "headquartersCity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "industry" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN     "isDemoFixture" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicData" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "websiteHost" TEXT,
ALTER COLUMN "address" SET DEFAULT '',
ALTER COLUMN "benefits" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "contacts" SET DEFAULT '[]',
ALTER COLUMN "dataCollectedAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "email" SET DEFAULT '',
ALTER COLUMN "intro" SET DEFAULT '',
ALTER COLUMN "location" SET DEFAULT '',
ALTER COLUMN "mainFocus" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "phone" SET DEFAULT '',
ALTER COLUMN "sources" SET DEFAULT '[]',
ALTER COLUMN "userReported" SET DEFAULT '{"salary":null,"promotion":null,"diversity":null,"maternity":null,"benefits":null}',
ALTER COLUMN "verification" SET DEFAULT '{"status":"unverified","checkedBy":"ai","checkedAt":null,"confidence":null,"notes":null}';

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_companyId_supersededAt_idx" ON "Submission"("companyId", "supersededAt");

-- CreateIndex
CREATE INDEX "Submission_userId_companyId_idx" ON "Submission"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_websiteHost_key" ON "Company"("websiteHost");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

