/**
 * src/application/dtos/SyncSubmissionsDto.ts
 *
 * DTOs for the POST /api/review/sync endpoint.
 * Defines the response shape for LeetCode submission auto-sync.
 */
export interface SyncedProblemDto {
    problemId: string;
    slug: string;
    title: string;
    difficulty: string;
    submittedAt: string;
    status: 'newly_tracked' | 'already_tracked';
}
export interface SyncResponseDto {
    success: boolean;
    message: string;
    data: {
        syncedAt: string;
        totalSubmissionsToday: number;
        newlyTracked: SyncedProblemDto[];
        alreadyTracked: SyncedProblemDto[];
        /** Problems that are tracked but haven't received a quality score today. */
        pendingQualityScores: SyncedProblemDto[];
    };
}
//# sourceMappingURL=SyncSubmissionsDto.d.ts.map