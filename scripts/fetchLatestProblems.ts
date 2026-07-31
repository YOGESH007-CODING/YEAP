import fetch from 'node-fetch';
import { PrismaClient, Difficulty } from '@prisma/client';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const db = new PrismaClient();

const QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      questions: data {
        frontendQuestionId: questionFrontendId
        title
        titleSlug
        difficulty
        isPaidOnly
        topicTags {
          name
        }
      }
    }
  }
`;

async function fetchLatestProblems() {
  console.log('Fetching latest 30 problems from LeetCode...');
  try {
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          categorySlug: '',
          limit: 30,
          skip: 0,
          filters: {
            orderBy: 'FRONTEND_ID',
            sortOrder: 'DESCENDING',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json() as any;
    if (json.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    const questions = json.data?.problemsetQuestionList?.questions || [];
    console.log(`\nFound ${questions.length} latest problems.`);
    console.log('Synchronizing with database...');
    console.log('='.repeat(60));

    let addedCount = 0;

    for (const q of questions) {
      const slug = q.titleSlug;
      const title = q.title;
      const difficulty = q.difficulty.toUpperCase() as Difficulty;
      const topicTags = q.topicTags.map((t: any) => t.name);

      // Check if problem already exists in database
      const existing = await db.problem.findUnique({
        where: { slug },
      });

      if (!existing) {
        await db.problem.create({
          data: {
            slug,
            title,
            difficulty,
            topicTags,
            companyTags: [],
          },
        });
        const paidStr = q.isPaidOnly ? '🔒 Premium' : '🔓 Free';
        console.log(`[+] Added: [#${q.frontendQuestionId}] ${title} (${difficulty}) - ${paidStr}`);
        addedCount++;
      } else {
        console.log(`[ ] Already exists: [#${q.frontendQuestionId}] ${title}`);
      }
    }

    console.log('='.repeat(60));
    console.log(`Sync complete. Added ${addedCount} new problems to the database.`);
  } catch (error: any) {
    console.error('Error fetching/syncing problems:', error.message);
  } finally {
    await db.$disconnect();
  }
}

fetchLatestProblems();
