/**
 * scripts/verify-topup.ts
 *
 * End-to-End Integration Check for:
 *   1. Database & Seeding  — verifies companyTags are populated
 *   2. Repository Logic    — verifies getUnseenProblems filtering
 *   3. Queue Engine Output — verifies the FAANG Top-Up produces the correct payload
 *
 * Run with:
 *   npx ts-node --project scripts/tsconfig.scripts.json scripts/verify-topup.ts
 *
 * Cleans up all test data it creates before exiting.
 */

import { PrismaClient, Difficulty } from '@prisma/client';
import { PrismaProblemRepository } from '../src/infrastructure/repositories/PrismaProblemRepository';
import { PrismaProblemProgressRepository } from '../src/infrastructure/repositories/PrismaProblemProgressRepository';
import { PrismaUserRepository } from '../src/infrastructure/repositories/PrismaUserRepository';
import { QueueCompilationEngine } from '../src/application/use-cases/QueueCompilationEngine';
import type { DailyBundle, INotificationProvider, NotificationResult } from '../src/domain/interfaces/INotificationProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const db = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`    PASS — ${label}`);
    passed++;
  } else {
    console.error(`  FAIL — ${label}${detail ? `\n       Detail: ${detail}` : ''}`);
    failed++;
  }
}

// ─── Mock Notification Provider ───────────────────────────────────────────────

class CaptureMockProvider implements INotificationProvider {
  public lastBundle: DailyBundle | null = null;

  async sendDailyBundle(bundle: DailyBundle, _target: string): Promise<NotificationResult> {
    this.lastBundle = bundle;
    return { success: true, messageId: 'mock-msg-id' };
  }
}

// ─── Test Fixture ─────────────────────────────────────────────────────────────

const RUN_ID = `vfy${Date.now()}`;
const TEST_USER_EMAIL = `test-${RUN_ID}@yeap-verify.local`;

const FAANG_SEED_PROBLEMS = [
  {
    slug: `${RUN_ID}-faang-1`,
    title: 'Verify Problem A (Amazon)',
    difficulty: Difficulty.EASY,
    topicTags: ['Array'],
    companyTags: ['Amazon'],
  },
  {
    slug: `${RUN_ID}-faang-2`,
    title: 'Verify Problem B (Google)',
    difficulty: Difficulty.MEDIUM,
    topicTags: ['Hash Table'],
    companyTags: ['Google'],
  },
  {
    slug: `${RUN_ID}-faang-3`,
    title: 'Verify Problem C (Meta)',
    difficulty: Difficulty.HARD,
    topicTags: ['Dynamic Programming'],
    companyTags: ['Meta'],
  },
  {
    slug: `${RUN_ID}-faang-4`,
    title: 'Verify Problem D (Amazon+Meta)',
    difficulty: Difficulty.MEDIUM,
    topicTags: ['String'],
    companyTags: ['Amazon', 'Meta'],
  },
  {
    slug: `${RUN_ID}-seen-1`,
    title: 'Verify Problem E (Google SEEN)',
    difficulty: Difficulty.EASY,
    topicTags: ['Tree'],
    companyTags: ['Google'],
  },
];

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(userId: string | null, problemIds: string[]): Promise<void> {
  console.log('\n🧹  Cleaning up test data...');
  try {
    if (userId) {
      await db.user.delete({ where: { id: userId } });
    }
    if (problemIds.length > 0) {
      await db.problem.deleteMany({ where: { id: { in: problemIds } } });
    }
    console.log('    ✔ Cleanup complete.\n');
  } catch (err) {
    console.error('    ⚠ Cleanup partially failed —', err);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  YEAP — Integration Verify: FAANG Top-Up Feature');
  console.log('═══════════════════════════════════════════════════════════\n');

  await db.$connect();
  console.log('🔌  Database connected.\n');

  const problemRepo = new PrismaProblemRepository(db);
  const progressRepo = new PrismaProblemProgressRepository(db);
  const userRepo = new PrismaUserRepository(db);

  let userId: string | null = null;
  const createdProblemIds: string[] = [];

  try {
    // ══════════════════════════════════════════════════════════════════════
    // STEP 1 — Database & Seeding
    // ══════════════════════════════════════════════════════════════════════
    console.log('─────────────────────────────────────────────────────────');
    console.log('  STEP 1 › Database & Seeding');
    console.log('─────────────────────────────────────────────────────────');

    const totalProblems = await db.problem.count();
    assert('Prisma client is generated and DB is reachable', totalProblems >= 0, `Problem count = ${totalProblems}`);

    const twoSum = await problemRepo.findBySlug('two-sum');
    assert('"two-sum" exists in the DB', twoSum !== null);
    assert('"two-sum" has non-empty companyTags', (twoSum?.companyTags?.length ?? 0) > 0,
      `companyTags = ${JSON.stringify(twoSum?.companyTags)}`);
    assert('"two-sum" has "Google" in companyTags (from seed)', twoSum?.companyTags?.includes('Google') ?? false,
      `companyTags = ${JSON.stringify(twoSum?.companyTags)}`);

    console.log(`\n     ℹ️   two-sum companyTags: ${JSON.stringify(twoSum?.companyTags)}`);
    console.log(`     ℹ️   Total problems in DB: ${totalProblems}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2 — Repository Logic (getUnseenProblems)
    // ══════════════════════════════════════════════════════════════════════
    console.log('─────────────────────────────────────────────────────────');
    console.log('  STEP 2 › Repository Logic — getUnseenProblems');
    console.log('─────────────────────────────────────────────────────────');

    // 2a. Create test user
    const testUser = await userRepo.create({
      email: TEST_USER_EMAIL,
      name: 'Verify Bot',
      telegramChatId: 'mock-chat-999',
    });
    userId = testUser.id;
    assert('Test user created successfully', !!userId);
    console.log(`  User ID: ${userId}`);

    // 2b. Inject 5 test problems (4 unseen FAANG + 1 that will be "seen")
    for (const p of FAANG_SEED_PROBLEMS) {
      const created = await problemRepo.create(p);
      createdProblemIds.push(created.id);
    }
    assert(`${FAANG_SEED_PROBLEMS.length} test problems inserted`, createdProblemIds.length === FAANG_SEED_PROBLEMS.length);

    // 2c. Create a progress record for the "seen" problem (index 4)
    const seenProblemId = createdProblemIds[4];
    const seenProgress = await db.problemProgress.create({
      data: {
        userId,
        problemId: seenProblemId,
        repetitions: 1,
        easinessFactor: 2.5,
        intervalDays: 1,
        dueDate: new Date(),   // due today — becomes the 1 review item
      },
    });
    assert('Progress record created for "seen" problem', !!seenProgress.id);
    console.log(`  Seen problem ID: ${seenProblemId}  (slug: ${FAANG_SEED_PROBLEMS[4].slug})`);

    // 2d. Call getUnseenProblems(limit=4, companyTags=['Amazon','Google','Meta'])
    const unseenProblems = await problemRepo.getUnseenProblems(userId, 4, ['Amazon', 'Google', 'Meta']);

    assert('getUnseenProblems returns exactly 4 problems', unseenProblems.length === 4,
      `Returned ${unseenProblems.length}: [${unseenProblems.map(p => p.slug).join(', ')}]`);

    const returnedIds = unseenProblems.map(p => p.id);
    assert('"Seen" problem is NOT in the unseen results', !returnedIds.includes(seenProblemId),
      `seenProblemId=${seenProblemId}, returnedIds=[${returnedIds.join(', ')}]`);

    const allHaveFaangTag = unseenProblems.every(p =>
      p.companyTags.some(t => ['Amazon', 'Google', 'Meta'].includes(t)));
    assert('All returned problems have ≥1 FAANG tag', allHaveFaangTag,
      `Tags: ${unseenProblems.map(p => `${p.slug}→[${p.companyTags.join(',')}]`).join(', ')}`);

    console.log(`\n   Unseen problems: [${unseenProblems.map(p => p.slug).join(', ')}]\n`);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3 — Queue Engine Output
    // ══════════════════════════════════════════════════════════════════════
    console.log('─────────────────────────────────────────────────────────');
    console.log('  STEP 3 › QueueCompilationEngine — End-to-End');
    console.log('─────────────────────────────────────────────────────────');

    const mockProvider = new CaptureMockProvider();
    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo,
      problemRepository: problemRepo,
      userRepository: userRepo,
      notificationProvider: mockProvider,
    });

    const compilationResult = await engine.execute();

    assert('Engine completed with 0 failures', compilationResult.failures.length === 0,
      `Failures: ${JSON.stringify(compilationResult.failures)}`);

    // Note: engine.execute() processes ALL users with due items.
    // Our test user has exactly 1 due item → will be in usersProcessed.
    // We check ≥ 1 because other users might also exist in the DB.
    assert('At least 1 user was processed (our test user)', compilationResult.usersProcessed >= 1,
      `usersProcessed = ${compilationResult.usersProcessed}`);

    // Bundle from mock provider for our specific user
    const bundle = mockProvider.lastBundle;
    assert('Bundle was captured by mock provider', bundle !== null);

    if (bundle) {
      assert('Bundle contains our test user ID', bundle.userId === userId,
        `bundle.userId=${bundle.userId}, expected=${userId}`);

      assert('Bundle.reviewItems.length === 5 (soft-cap)', bundle.reviewItems.length === 5,
        `Got ${bundle.reviewItems.length} items: [${bundle.reviewItems.map(i => i.problemSlug).join(', ')}]`);

      const standardItems = bundle.reviewItems.filter(i => !i.isNewChallenge);
      const bonusItems = bundle.reviewItems.filter(i => i.isNewChallenge === true);

      assert('Exactly 1 standard review item', standardItems.length === 1,
        `Standard: [${standardItems.map(i => i.problemSlug).join(', ')}]`);

      assert('Exactly 4 bonus items with isNewChallenge', bonusItems.length === 4,
        `Bonus: [${bonusItems.map(i => i.problemSlug).join(', ')}]`);

      assert('All 4 bonus items have isNewChallenge === true', bonusItems.every(i => i.isNewChallenge === true));

      // The standard item must be our seen problem
      const seenProblemRecord = await db.problem.findUnique({ where: { id: seenProblemId } });
      assert('Standard review item slug matches the seeded progress problem',
        standardItems[0]?.problemSlug === seenProblemRecord?.slug,
        `Expected=${seenProblemRecord?.slug}, Got=${standardItems[0]?.problemSlug}`);

      console.log(`\n      Standard review item : ${standardItems.map(i => i.problemSlug).join(', ')}`);
      console.log(`      Bonus new challenges  : ${bonusItems.map(i => i.problemSlug).join(', ')}`);
      console.log(`        totalItemsDispatched  : ${compilationResult.totalItemsDispatched}`);
    }

  } finally {
    await cleanup(userId, createdProblemIds);
    await db.$disconnect();

    console.log('═══════════════════════════════════════════════════════════');
    if (failed === 0) {
      console.log(`    ALL ${passed} ASSERTIONS PASSED`);
    } else {
      console.log(`  RESULTS: ${passed} passed  /  ${failed} FAILED`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('\n💥  Unhandled error in verify-topup:', err);
  db.$disconnect().finally(() => process.exit(1));
});
