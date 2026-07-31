import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Reading JSON files...');

  // 1. Load the JSON files
  const seedDataPath = path.join(__dirname, 'prisma_problems_seed.json');
  const leetcodeDataPath = path.join(__dirname, 'leetcode-problems.json');

  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
  const leetcodeData = JSON.parse(fs.readFileSync(leetcodeDataPath, 'utf-8'));

  // 2. Create a lookup map for the company tags using 'slug' as the key
  const companyTagsMap = new Map<string, string[]>();
  for (const item of seedData) {
    if (item.slug && item.companyTags) {
      companyTagsMap.set(item.slug, item.companyTags);
    }
  }

  // 3. Build the merged array mapping to your Prisma Schema
  const problemsToInsert = [];

  for (const lcProblem of leetcodeData) {
    // Extract the titleSlug as our unique identifier
    const slug = lcProblem.titleSlug;

    // Map the topicTags from [{ name: "Array", ... }] to ["Array"]
    const topicTags = lcProblem.topicTags
      ? lcProblem.topicTags.map((tag: any) => tag.name)
      : [];

    // Look up company tags from our seed map (default to empty array if not found)
    const companyTags = companyTagsMap.get(slug) || [];

    // Ensure difficulty matches the Prisma Enum (EASY, MEDIUM, HARD)
    const difficulty = lcProblem.difficulty ? lcProblem.difficulty.toUpperCase() : 'EASY';

    problemsToInsert.push({
      slug,
      title: lcProblem.title,
      difficulty,
      topicTags,
      companyTags,
    });
  }

  console.log(`Preparing to insert ${problemsToInsert.length} problems...`);

  // 4. Bulk insert into the database using createMany
  const result = await prisma.problem.createMany({
    data: problemsToInsert,
    skipDuplicates: true, // Prevents crashing if a slug already exists
  });

  console.log(`Successfully inserted ${result.count} problems into the database.`);
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });