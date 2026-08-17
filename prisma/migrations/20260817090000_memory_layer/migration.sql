CREATE TYPE "MistakeType" AS ENUM ('LOGIC_ERROR', 'EDGE_CASE', 'WRONG_APPROACH', 'TIME_COMPLEXITY', 'MISREAD_PROBLEM', 'FORGOT_PATTERN', 'SYNTAX_SLIP');

CREATE TABLE "user_mistakes" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "problemId" TEXT NOT NULL,
  "topicName" TEXT NOT NULL, "mistakeType" "MistakeType" NOT NULL,
  "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), "recurrenceCount" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "user_mistakes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_mistakes_userId_problemId_mistakeType_key" ON "user_mistakes"("userId", "problemId", "mistakeType");
CREATE INDEX "user_mistakes_userId_topicName_idx" ON "user_mistakes"("userId", "topicName");
ALTER TABLE "user_mistakes" ADD CONSTRAINT "user_mistakes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_mistakes" ADD CONSTRAINT "user_mistakes_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_topic_masteries" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "topicName" TEXT NOT NULL,
  "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0, "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "correctAttempts" INTEGER NOT NULL DEFAULT 0, "mistakeCount" INTEGER NOT NULL DEFAULT 0,
  "lastPracticedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_topic_masteries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_topic_masteries_userId_topicName_key" ON "user_topic_masteries"("userId", "topicName");
CREATE INDEX "user_topic_masteries_userId_masteryScore_idx" ON "user_topic_masteries"("userId", "masteryScore");
ALTER TABLE "user_topic_masteries" ADD CONSTRAINT "user_topic_masteries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_notes" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "problemId" TEXT NOT NULL,
  "noteText" TEXT NOT NULL, "importantFlag" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_notes_userId_problemId_key" ON "user_notes"("userId", "problemId");
CREATE INDEX "user_notes_userId_importantFlag_idx" ON "user_notes"("userId", "importantFlag");
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
