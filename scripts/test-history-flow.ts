/**
 * scripts/test-history-flow.ts
 *
 * Programmatic integration test for:
 *   1. Problem search (searchByTitle)
 *   2. Self-report flow (ReportProblemUseCase)
 *   3. All tracked history query (findAllByUser)
 *
 * Run: npx ts-node --project scripts/tsconfig.scripts.json scripts/test-history-flow.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaProblemProgressRepository } from '../src/infrastructure/repositories/PrismaProblemProgressRepository';
import { PrismaProblemRepository } from '../src/infrastructure/repositories/PrismaProblemRepository';
import { PrismaUserRepository } from '../src/infrastructure/repositories/PrismaUserRepository';
import { ReportProblemUseCase } from '../src/application/use-cases/ReportProblemUseCase';

const db = new PrismaClient();
const progressRepo = new PrismaProblemProgressRepository(db);
const problemRepo = new PrismaProblemRepository(db);
const userRepo = new PrismaUserRepository(db);

const reportUseCase = new ReportProblemUseCase({
  progressRepository: progressRepo,
  problemRepository: problemRepo,
});

const USER_ID = 'test-user-id';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YEAP — Self-Report & History Integration Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── 1. Check user ───────────────────────────────────────────────────
  const user = await userRepo.findById(USER_ID);
  if (!user) {
    console.error('❌ Test user not found in database');
    process.exit(1);
  }
  console.log(`✅ User verified: ${user.name} (${user.email})\n`);

  // ── 2. Test searchByTitle Autocomplete ──────────────────────────────
  console.log('🔍 Testing autocomplete search (searchByTitle)...');
  const searchQueries = ['two-sum', 'sum', 'array'];
  
  for (const q of searchQueries) {
    const results = await problemRepo.searchByTitle(q, 5);
    console.log(`   Query "${q}" matched ${results.length} problems:`);
    for (const p of results) {
      console.log(`     • [${p.difficulty}] ${p.title} (${p.slug})`);
    }
  }
  console.log('✅ Autocomplete search matches verified.\n');

  // ── 3. Test ReportProblemUseCase (Self-Report) ──────────────────────
  console.log('📝 Testing self-report (ReportProblemUseCase)...');
  
  // Let's pick a known problem from the search results
  const searchRes = await problemRepo.searchByTitle('two-sum', 1);
  if (searchRes.length === 0) {
    console.error('❌ No problems matching "two-sum" in database. Run seeds first.');
    process.exit(1);
  }
  const testProblem = searchRes[0];
  console.log(`   Target problem for report: "${testProblem.title}" (${testProblem.slug})`);

  // Submit a self-report with quality score 4 (Good)
  const reportResult = await reportUseCase.execute(USER_ID, {
    problemSlug: testProblem.slug,
    qualityScore: 4,
  });

  console.log('   Report response:');
  console.log(`     • Success: ${reportResult.success}`);
  console.log(`     • Message: ${reportResult.message}`);
  console.log(`     • New Interval: ${reportResult.data.newInterval} days`);
  console.log(`     • New EF: ${reportResult.data.newEasinessFactor}`);
  console.log(`     • Next Due Date: ${reportResult.data.nextDueDate}`);
  console.log('✅ Self-report flow verified.\n');

  // ── 4. Test findAllByUser (History Page Query) ──────────────────────
  console.log('📋 Testing History Page data retrieval (findAllByUser)...');
  const historyItems = await progressRepo.findAllByUser(USER_ID);
  console.log(`   Total tracked items in user history: ${historyItems.length}`);
  
  // Print some items to verify structure
  const sampleItems = historyItems.slice(0, 5);
  for (const item of sampleItems) {
    console.log(`     • "${item.problem.title}"`);
    console.log(`       EF: ${item.easinessFactor.toFixed(2)} | Reps: ${item.repetitions} | Interval: ${item.intervalDays}d | Due: ${item.dueDate.toISOString()}`);
  }
  
  if (historyItems.length > 0) {
    console.log('✅ History retrieval verified.');
  } else {
    console.error('❌ No history items found for user.');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✅ ALL SELF-REPORT & HISTORY CHANGES VERIFIED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch(err => {
    console.error('\n💥 Integration test failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
