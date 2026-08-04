ALTER TABLE "users"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

CREATE TABLE "account_deletion_reauth" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "stateHash" TEXT NOT NULL,
  "grantHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_deletion_reauth_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_deletion_reauth_stateHash_key" ON "account_deletion_reauth"("stateHash");
CREATE INDEX "account_deletion_reauth_userId_expiresAt_idx" ON "account_deletion_reauth"("userId", "expiresAt");

CREATE TABLE "account_deletion_audit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_deletion_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "account_deletion_audit_userId_idx" ON "account_deletion_audit"("userId");
CREATE INDEX "account_deletion_audit_occurredAt_idx" ON "account_deletion_audit"("occurredAt");

CREATE OR REPLACE FUNCTION prevent_account_deletion_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'account deletion audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_deletion_audit_immutable
BEFORE UPDATE OR DELETE ON "account_deletion_audit"
FOR EACH ROW EXECUTE FUNCTION prevent_account_deletion_audit_mutation();
