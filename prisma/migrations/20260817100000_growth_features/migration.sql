ALTER TABLE "users" ADD COLUMN "shareToken" TEXT;
ALTER TABLE "users" ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "shareTrackerId" TEXT;
CREATE UNIQUE INDEX "users_shareToken_key" ON "users"("shareToken");

CREATE TABLE "user_streaks" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0, "lastStreakDate" TIMESTAMP(3),
  "streakSafeToday" BOOLEAN NOT NULL DEFAULT false, "freezesAvailable" INTEGER NOT NULL DEFAULT 1,
  "freezeRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_streaks_userId_key" ON "user_streaks"("userId");
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
