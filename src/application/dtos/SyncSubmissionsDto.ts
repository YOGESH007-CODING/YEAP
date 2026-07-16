/**
 * src/application/dtos/SyncSubmissionsDto.ts
 *
 * DTOs for the POST /api/review/sync endpoint.
 * Defines the response shape for LeetCode submission auto-sync.
 */

// ─── Individual Synced Problem ────────────────────────────────────────────────

export interface SyncedProblemDto {
  problemId: string;
  slug: string;
  title: string;
  difficulty: string;
  submittedAt: string; // ISO 8601 — converted from LeetCode Unix timestamp
  status: 'newly_tracked' | 'already_tracked';
}

// ─── Sync Response ────────────────────────────────────────────────────────────

export interface SyncResponseDto {
  success: boolean;
  message: string;
  data: {
    syncedAt: string; // ISO 8601 timestamp of when sync was executed
    totalSubmissionsToday: number;
    newlyTracked: SyncedProblemDto[];
    alreadyTracked: SyncedProblemDto[];
    /** Problems that are tracked but haven't received a quality score today. */
    pendingQualityScores: SyncedProblemDto[];
  };
}
