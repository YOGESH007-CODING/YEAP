-- Trigram indexes for problem title/slug autocomplete search.
--
-- ReviewController.searchProblems → PrismaProblemRepository.searchByTitle compiles
-- to `ILIKE '%q%'`, whose leading wildcard cannot use a btree index and forces a
-- sequential scan of the "problems" table. A GIN trigram index lets Postgres serve
-- these ILIKE queries from an index instead. See PERFORMANCE.md M4 / CHANGES.md.
--
-- The `CREATE EXTENSION` line is why this is hand-written: Prisma only manages
-- extensions under the postgresqlExtensions preview feature. The two indexes are
-- ALSO declared on the Problem model in schema.prisma, using
-- `@@index([title(ops: raw("gin_trgm_ops"))], type: Gin, map: "problems_title_trgm_idx")`.
-- Keep both in sync: if the schema declaration is removed, the next
-- `prisma migrate dev` will generate a DROP for these indexes, because an index
-- present only in raw migration SQL looks like drift to Prisma.
--
-- Note: `CREATE INDEX` (non-concurrent) briefly locks the table for writes while it
-- builds. The problems catalog is small (~4k rows) so this is effectively instant.
-- On a very large table, build these with CREATE INDEX CONCURRENTLY outside a
-- migration transaction instead.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "problems_title_trgm_idx"
  ON "problems" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "problems_slug_trgm_idx"
  ON "problems" USING GIN ("slug" gin_trgm_ops);
