/**
 * Synchronizes the public LeetCode problem catalogue into Prisma.
 *
 * The job reads only the 100 newest public questions. Inserts are idempotent:
 * existing slugs are left unchanged and newly published questions are
 * bulk-inserted with empty company tags.
 */

import 'dotenv/config';
import { Difficulty, PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const endpoint = process.env['LEETCODE_GRAPHQL_URL'] || 'https://leetcode.com/graphql';
const PAGE_SIZE = 100;

const QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
      total: totalNum
      questions: data {
        title
        titleSlug
        difficulty
        isPaidOnly
        topicTags { name }
      }
    }
  }
`;

type LeetCodeQuestion = {
  title: string;
  titleSlug: string;
  difficulty: string;
  isPaidOnly: boolean;
  topicTags: Array<{ name: string }>;
};

type CatalogueResponse = {
  data?: { problemsetQuestionList?: { total: number; questions: LeetCodeQuestion[] } };
  errors?: Array<{ message: string }>;
};

const validDifficulty = (value: string): Difficulty | null => {
  const normalized = value.toUpperCase();
  return normalized === 'EASY' || normalized === 'MEDIUM' || normalized === 'HARD'
    ? normalized
    : null;
};

const fetchPage = async (skip: number): Promise<{ total: number; questions: LeetCodeQuestion[] }> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'YEAP-SRS/1.0', Referer: 'https://leetcode.com' },
    body: JSON.stringify({
      query: QUERY,
      variables: { categorySlug: '', limit: PAGE_SIZE, skip, filters: { orderBy: 'FRONTEND_ID', sortOrder: 'DESCENDING' } },
    }),
  });
  if (!response.ok) throw new Error(`LeetCode returned HTTP ${response.status}`);
  const payload = await response.json() as CatalogueResponse;
  if (payload.errors?.length) throw new Error(`LeetCode GraphQL error: ${payload.errors.map((error) => error.message).join(', ')}`);
  const catalogue = payload.data?.problemsetQuestionList;
  if (!catalogue) throw new Error('LeetCode returned an incomplete catalogue response');
  return { total: catalogue.total, questions: catalogue.questions };
};

async function main(): Promise<void> {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is required to synchronize problems');
  }
  // Validate database configuration before making dozens of external API calls.
  await db.$connect();

  const page = await fetchPage(0);
  const questions = page.questions;
  console.info(`[ProblemSync] Fetched the ${questions.length} newest LeetCode questions (catalogue total: ${page.total}).`);

  const existing = new Set((await db.problem.findMany({ select: { slug: true } })).map((problem) => problem.slug));
  const newProblems = questions.flatMap((question) => {
    const difficulty = validDifficulty(question.difficulty);
    if (!difficulty || existing.has(question.titleSlug)) return [];
    return [{
      slug: question.titleSlug,
      title: question.title,
      difficulty,
      topicTags: question.topicTags.map((tag) => tag.name),
      companyTags: [],
    }];
  });

  if (newProblems.length > 0) {
    const inserted = await db.problem.createMany({ data: newProblems, skipDuplicates: true });
    console.info(`[ProblemSync] Added ${inserted.count} new LeetCode questions.`);
  } else {
    console.info('[ProblemSync] No new LeetCode questions found.');
  }
}

main()
  .catch((error: unknown) => {
    console.error('[ProblemSync] Failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
