/**
 * src/infrastructure/repositories/PrismaProblemRepository.ts
 *
 * Concrete implementation of IProblemRepository using Prisma.
 */

import { Prisma, type PrismaClient, type Problem } from '@prisma/client';
import type {
  IProblemRepository,
  ProblemDto,
  CreateProblemDto,
  Difficulty,
} from '../../domain/interfaces/IProblemRepository';

// ─── Mapper ───────────────────────────────────────────────────────────────────

const toDto = (problem: Problem): ProblemDto => ({
  id: problem.id,
  slug: problem.slug,
  title: problem.title,
  difficulty: problem.difficulty as Difficulty,
  topicTags: problem.topicTags,
  companyTags: problem.companyTags,
  createdAt: problem.createdAt,
  updatedAt: problem.updatedAt,
});

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaProblemRepository implements IProblemRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<ProblemDto | null> {
    const problem = await this.db.problem.findUnique({ where: { id } });
    return problem ? toDto(problem) : null;
  }

  async findBySlug(slug: string): Promise<ProblemDto | null> {
    const problem = await this.db.problem.findUnique({ where: { slug } });
    return problem ? toDto(problem) : null;
  }

  async findAll(): Promise<ProblemDto[]> {
    const problems = await this.db.problem.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return problems.map(toDto);
  }

  async create(data: CreateProblemDto): Promise<ProblemDto> {
    const problem = await this.db.problem.create({
      data: {
        slug: data.slug,
        title: data.title,
        difficulty: data.difficulty,
        topicTags: data.topicTags,
        companyTags: data.companyTags ?? [],
      },
    });
    return toDto(problem);
  }

  async upsertBySlug(data: CreateProblemDto): Promise<ProblemDto> {
    const problem = await this.db.problem.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        difficulty: data.difficulty,
        topicTags: data.topicTags,
        companyTags: data.companyTags ?? [],
      },
      create: {
        slug: data.slug,
        title: data.title,
        difficulty: data.difficulty,
        topicTags: data.topicTags,
        companyTags: data.companyTags ?? [],
      },
    });
    return toDto(problem);
  }

  async getUnseenProblems(
    userId: string,
    limit: number,
    companyTags?: string[],
    topicTags?: string[],
  ): Promise<ProblemDto[]> {
    // PostgreSQL's ORDER BY RANDOM() ensures every eligible unseen problem has
    // an equal chance of being selected. Prisma does not expose this ordering.
    const companyFilter = companyTags && companyTags.length > 0
      ? Prisma.sql`AND p."companyTags" && ARRAY[${Prisma.join(companyTags)}]::text[]`
      : Prisma.empty;
    const topicFilter = topicTags && topicTags.length > 0
      ? Prisma.sql`AND p."topicTags" && ARRAY[${Prisma.join(topicTags)}]::text[]`
      : Prisma.empty;

    const problems = await this.db.$queryRaw<Problem[]>`
      SELECT p.*
      FROM problems p
      WHERE NOT EXISTS (
        SELECT 1
        FROM problem_progresses progress
        WHERE progress."problemId" = p.id AND progress."userId" = ${userId}
      )
      ${companyFilter}
      ${topicFilter}
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;

    return problems.map(toDto);
  }

  async searchByTitle(query: string, limit: number): Promise<ProblemDto[]> {
    const problems = await this.db.problem.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { title: 'asc' },
    });

    return problems.map(toDto);
  }
}
