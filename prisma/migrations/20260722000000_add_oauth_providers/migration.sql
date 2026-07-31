CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

ALTER TABLE "users"
  ADD COLUMN "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "providerId" TEXT;

UPDATE "users"
SET "provider" = 'GOOGLE', "providerId" = "googleId"
WHERE "googleId" IS NOT NULL;

DROP INDEX IF EXISTS "users_googleId_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId";

CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");
