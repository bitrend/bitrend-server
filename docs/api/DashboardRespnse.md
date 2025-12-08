{
  user: {
    id: number;
    username: string;
    name: string;
    avatarUrl: string;
    skillLevel: string;
    totalScore: number;
    overallGrade: string;
  },
  evaluationProjects: {
    selected: Array<{
      id: string;
      name: string;
      description: string;
      isPublic: boolean;
      evaluationStatus: 'pending' | 'running' | 'completed' | 'failed';
      evaluationScore?: number;
      evaluationGrade?: string;
      lastEvaluatedAt?: string;
      priority: number;
    }>,
    summary: {
      totalSelected: number;
      maxAllowed: number;
      completedEvaluations: number;
      pendingEvaluations: number;
      overallScore?: number;
      availableSlots: number;
    }
  },
  skillAnalysis: {
    total: {
      score: string;
      grade: string;
      skillLevel: string;
      growth: { percentage: number; absolute: string; period: string; }
    },
    distribution: {
      codeQuality: { percentage: number; score: number; label: string; }
      projectStructure: { percentage: number; score: number; label: string; }
      contributionPattern: { percentage: number; score: number; label: string; }
      skillAssessment: { percentage: number; score: number; label: string; }
    },
    variation: {
      chartData: Array<{ date: string; value: number; formatted: string; }>
      growth: { percentage: number; absolute: string; period: string; }
    }
  },
  ranking: {
    userPosition: number;
    totalUsers: number;
    percentile?: number;
    topUsers: Array<{
      rank: number;
      userId: number;
      username: string;
      name?: string;
      avatarUrl: string;
      score: number;
      skillLevel?: string;
      change: number;
    }>
  },
  recentActivity: { ... }
}