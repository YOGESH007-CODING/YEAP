CREATE TABLE "company_trackers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "dailySolveGoal" INTEGER NOT NULL DEFAULT 3,
  "dailyRevisionGoal" INTEGER NOT NULL DEFAULT 5,
  "weeklySolveGoal" INTEGER NOT NULL DEFAULT 15,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_trackers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_trackers_userId_companyName_key" ON "company_trackers"("userId", "companyName");
CREATE INDEX "company_trackers_userId_isActive_idx" ON "company_trackers"("userId", "isActive");
ALTER TABLE "company_trackers" ADD CONSTRAINT "company_trackers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
