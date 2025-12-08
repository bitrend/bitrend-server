const userRepository = require('../repositories/user.repository');
const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const analysisRepository = require('../repositories/analysis.repository');
const userStatsRepository = require('../repositories/userStats.repository');
const userRankingRepository = require('../repositories/userRanking.repository');
const userActivityRepository = require('../repositories/userActivity.repository');
const prisma = require('../config/prisma');
const { convertScoreToBitByte } = require('../utils/score');

const MAX_PROJECTS_PER_USER = 3;

/**
 * 대시보드 전체 데이터 조회
 */
const getDashboardData = async (userId, period = '30d') => {
  try {
    // 병렬로 데이터 조회
    const [
      user,
      userStats,
      evaluationProjects,
      userRanking,
      recentActivities
    ] = await Promise.all([
      userRepository.findById(userId),
      userStatsRepository.findByUserId(userId),
      evaluationProjectRepository.findByUserId(userId),
      userRankingRepository.findByUserId(userId, 'overall'),
      userActivityRepository.findByUserId(userId, { take: 10 })
    ]);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // 스킬 분석 정보 (먼저 계산하여 총합 점수 확보)
    const skillAnalysisData = await getSkillAnalysisData(userId, evaluationProjects, period);

    // 카테고리별 총합 점수 계산
    const { convertBitByteToScore } = require('../utils/score');
    const totalSkillScore = skillAnalysisData?.total?.score
      ? convertBitByteToScore(skillAnalysisData.total.score.byte, skillAnalysisData.total.score.bit)
      : null;

    // 사용자 기본 정보 (총합 점수 사용)
    const userData = await getUserData(user, userStats, totalSkillScore);

    // 평가 프로젝트 정보 (총합 점수 사용)
    const evaluationProjectsData = await getEvaluationProjectsData(evaluationProjects, userId, totalSkillScore);

    // 랭킹 정보
    const rankingData = await getRankingData(userId, userRanking);

    // 최근 활동 정보
    const recentActivityData = await getRecentActivityData(recentActivities, userStats, evaluationProjects);

    return {
      user: userData,
      evaluationProjects: evaluationProjectsData,
      skillAnalysis: skillAnalysisData,
      ranking: rankingData,
      recentActivity: recentActivityData
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

/**
 * 사용자 기본 정보 구성
 */
const getUserData = async (user, userStats, totalSkillScore) => {
  // 카테고리별 총합 점수를 사용 (fallback으로 userStats 사용)
  const finalScore = totalSkillScore || userStats?.averageScore || 0;
  const grade = calculateGrade(finalScore);
  const skillLevel = calculateSkillLevel(finalScore);

  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    avatarUrl: user.avatarUrl,
    skillLevel,
    totalScore: convertScoreToBitByte(finalScore),
    overallGrade: grade
  };
};

/**
 * 평가 프로젝트 정보 구성
 */
const getEvaluationProjectsData = async (evaluationProjects, userId, totalSkillScore = null) => {
  const projectsWithAnalysis = evaluationProjects.map(project => {
    const latestAnalysis = project.analyses && project.analyses.length > 0
      ? project.analyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;

    return {
      id: project.id.toString(),
      name: project.repository.name,
      description: project.repository.description || '',
      language: project.repository.language || 'N/A',
      isPublic: !project.repository.private,
      evaluationStatus: latestAnalysis?.status || 'pending',
      evaluationScore: latestAnalysis?.score ? convertScoreToBitByte(latestAnalysis.score) : undefined,
      evaluationGrade: latestAnalysis?.grade || undefined,
      lastEvaluatedAt: latestAnalysis?.completedAt?.toISOString() || undefined,
      priority: project.order,
      analysis: latestAnalysis
    };
  }).sort((a, b) => a.priority - b.priority);

  const completedProjects = projectsWithAnalysis.filter(p => p.evaluationStatus === 'completed');
  const completedEvaluations = completedProjects.length;
  const pendingEvaluations = projectsWithAnalysis.filter(p => p.evaluationStatus === 'pending').length;
  
  // 종합 점수는 totalSkillScore 사용 (fallback으로 UserStats 사용)
  let overallScoreBit = totalSkillScore;
  if (!overallScoreBit) {
    const userStats = await userStatsRepository.findByUserId(userId);
    overallScoreBit = userStats?.averageScore;
  }

  const overallScore = overallScoreBit ? convertScoreToBitByte(overallScoreBit) : undefined;

  // 최고 점수 프로젝트 찾기
  const bestProject = completedProjects.length > 0
    ? completedProjects.reduce((best, current) => 
        (current.evaluationScore?.bit || 0) > (best.evaluationScore?.bit || 0) ? current : best
      )
    : null;

  // 언어 분포 집계
  const languageDistribution = {};
  completedProjects.forEach(p => {
    const lang = p.language;
    if (lang && lang !== 'N/A') {
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    }
  });

  const selected = projectsWithAnalysis.map(({ analysis, ...project }) => project);

  return {
    selected,
    summary: {
      totalSelected: projectsWithAnalysis.length,
      maxAllowed: MAX_PROJECTS_PER_USER,
      completedEvaluations,
      pendingEvaluations,
      overallScore,
      overallGrade: overallScoreBit ? calculateGrade(overallScoreBit) : undefined,
      availableSlots: MAX_PROJECTS_PER_USER - projectsWithAnalysis.length,
      bestProject: bestProject ? {
        id: bestProject.id,
        name: bestProject.name,
        score: bestProject.evaluationScore,
        grade: bestProject.evaluationGrade
      } : undefined,
      languageDistribution,
      insights: generateProjectInsights(completedProjects, overallScoreBit)
    }
  };
};

/**
 * 프로젝트 인사이트 생성
 */
const generateProjectInsights = (completedProjects, overallScore) => {
  const insights = {
    strengths: [],
    improvements: []
  };

  if (completedProjects.length === 0) {
    insights.improvements.push('Complete project evaluations to get insights');
    return insights;
  }

  // 전체 점수 기반 인사이트
  if (overallScore >= 80) {
    insights.strengths.push('Consistently high-quality projects across portfolio');
  } else if (overallScore >= 70) {
    insights.strengths.push('Solid project portfolio with good technical foundation');
  } else if (overallScore < 60) {
    insights.improvements.push('Focus on improving code quality and project structure');
  }

  // 프로젝트 수 기반 인사이트
  if (completedProjects.length >= 3) {
    insights.strengths.push('Diverse portfolio with multiple evaluated projects');
  } else if (completedProjects.length === 1) {
    insights.improvements.push('Add more projects to demonstrate broader expertise');
  }

  // 점수 편차 분석
  const scores = completedProjects.map(p => p.evaluationScore?.bit || 0);
  const variance = scores.length > 1 ? calculateVariance(scores) : 0;
  
  if (variance < 100 && scores.length > 1) {
    insights.strengths.push('Consistent quality across different projects');
  } else if (variance > 200) {
    insights.improvements.push('Work on maintaining consistent quality standards');
  }

  return insights;
};

/**
 * 분산 계산
 */
const calculateVariance = (scores) => {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
};

/**
 * 스킬 분석 정보 구성
 */
const getSkillAnalysisData = async (userId, evaluationProjects, period) => {
  // 완료된 분석들 조회
  const completedAnalyses = await analysisRepository.findAll({
    userId,
    status: 'completed'
  });

  if (completedAnalyses.length === 0) {
    return getEmptySkillAnalysis();
  }

  // 카테고리별 점수 집계 (사용자 ID 기반으로 모든 분석 고려)
  const distribution = await calculateDistribution(userId);

  // 카테고리별 총합으로 전체 점수 계산
  const { convertBitByteToScore } = require('../utils/score');
  const totalScoreFromCategories = Object.values(distribution).reduce((sum, category) => {
    return sum + convertBitByteToScore(category.score.byte, category.score.bit);
  }, 0);

  const totalGrade = calculateGrade(totalScoreFromCategories);
  const skillLevel = calculateSkillLevel(totalScoreFromCategories);

  // 이전 분석과 비교하여 성장률 계산 (카테고리별 이전 총합 계산)
  let previousTotalScore = 0;
  if (completedAnalyses.length > 1) {
    // 이전 분석의 카테고리별 점수를 계산하기 위해 이전 분석들을 제외한 분포 계산
    const previousDistribution = await calculateDistributionForSpecificAnalyses(userId, completedAnalyses.slice(1));
    previousTotalScore = Object.values(previousDistribution).reduce((sum, category) => {
      return sum + convertBitByteToScore(category.score.byte, category.score.bit);
    }, 0);
  }
  const growth = calculateGrowth(totalScoreFromCategories, previousTotalScore);

  // 시간별 변화 추이
  const variation = await calculateVariation(completedAnalyses, period);

  return {
    total: {
      score: convertScoreToBitByte(totalScoreFromCategories),
      grade: totalGrade,
      skillLevel,
      growth
    },
    distribution,
    variation
  };
};

/**
 * 빈 스킬 분석 데이터 반환
 */
const getEmptySkillAnalysis = () => {
  return {
    total: {
      score: {
        bit: 0,
        byte: 0
      },
      grade: "N/A",
      skillLevel: "Intern",
      growth: {
        percentage: 0,
        absolute: "+0 bits",
        period: "since last evaluation"
      }
    },
    distribution: {
      codeQuality: { percentage: 0, score: { bit: 0, byte: 0 }, label: "Code Quality", improvement: "+0 bits" },
      projectStructure: { percentage: 0, score: { bit: 0, byte: 0 }, label: "Project Structure", improvement: "+0 bits" },
      contributionPattern: { percentage: 0, score: { bit: 0, byte: 0 }, label: "Contribution Pattern", improvement: "+0 bits" },
      skillAssessment: { percentage: 0, score: { bit: 0, byte: 0 }, label: "Skill Assessment", improvement: "+0 bits" }
    },
    variation: {
      chartData: [],
      growth: {
        percentage: 0,
        absolute: "+0 bits",
        period: "last 30 days"
      }
    }
  };
};

/**
 * 카테고리별 점수 분포 계산 (모든 완료된 분석의 평균 기준)
 */
const calculateDistribution = async (userId) => {
  const { convertBitByteToScore } = require('../utils/score');

  // 사용자의 모든 완료된 분석과 메트릭을 가져옴
  const analyses = await prisma.analysis.findMany({
    where: {
      userId,
      status: 'completed'
    },
    include: {
      metrics: true
    },
    orderBy: { createdAt: 'desc' }
  });

  if (analyses.length === 0) {
    return {
      codeQuality: { percentage: 35, score: { byte: 0, bit: 0 }, label: "Code Quality", improvement: "+0 bits" },
      projectStructure: { percentage: 30, score: { byte: 0, bit: 0 }, label: "Project Structure", improvement: "+0 bits" },
      contributionPattern: { percentage: 25, score: { byte: 0, bit: 0 }, label: "Contribution Pattern", improvement: "+0 bits" },
      skillAssessment: { percentage: 10, score: { byte: 0, bit: 0 }, label: "Skill Assessment", improvement: "+0 bits" }
    };
  }

  // 카테고리별 점수 계산
  const categories = {
    codeQuality: { label: 'Code Quality', percentage: 35, categoryName: 'code_quality' },
    projectStructure: { label: 'Project Structure', percentage: 30, categoryName: 'project_structure' },
    contributionPattern: { label: 'Contribution Pattern', percentage: 25, categoryName: 'activity' },
    skillAssessment: { label: 'Skill Assessment', percentage: 10, categoryName: 'languages' }
  };

  // 카테고리별 평균 점수 계산
  const categoryScores = {};

  Object.entries(categories).forEach(([key, config]) => {
    const categoryMetrics = [];

    // 모든 분석에서 해당 카테고리의 overall_score 수집
    analyses.forEach(analysis => {
      analysis.metrics.forEach(metric => {
        if (metric.category === config.categoryName && metric.name === 'overall_score') {
          categoryMetrics.push(metric.value);
        }
      });
    });

    // 카테고리별 총점 합산 (평균 대신 합산)
    const totalScore = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, score) => sum + score, 0)
      : 0;

    // 이전 분석과 비교를 위한 개선도 계산 (최근 분석 vs 이전 분석)
    const recentScore = categoryMetrics[0] || 0;
    const previousScore = categoryMetrics[1] || recentScore;
    const improvement = Math.round(recentScore - previousScore);

    categoryScores[key] = {
      percentage: config.percentage,
      score: convertScoreToBitByte(totalScore),
      label: config.label,
      improvement: improvement >= 0 ? `+${improvement} bits` : `${improvement} bits`
    };
  });

  console.log(`스킬 분포 계산 완료 (User ${userId}):`, {
    totalAnalyses: analyses.length,
    categoryScores: Object.entries(categoryScores).map(([cat, data]) => ({
      category: cat,
      totalScore: convertBitByteToScore(data.score.byte, data.score.bit),
      improvement: data.improvement
    }))
  });

  return categoryScores;
};

/**
 * 특정 분석들에 대한 카테고리별 점수 분포 계산
 */
const calculateDistributionForSpecificAnalyses = async (userId, analyses) => {
  const { convertBitByteToScore } = require('../utils/score');

  if (analyses.length === 0) {
    return {
      codeQuality: { percentage: 35, score: { byte: 0, bit: 0 }, label: "Code Quality", improvement: "+0 bits" },
      projectStructure: { percentage: 30, score: { byte: 0, bit: 0 }, label: "Project Structure", improvement: "+0 bits" },
      contributionPattern: { percentage: 25, score: { byte: 0, bit: 0 }, label: "Contribution Pattern", improvement: "+0 bits" },
      skillAssessment: { percentage: 10, score: { byte: 0, bit: 0 }, label: "Skill Assessment", improvement: "+0 bits" }
    };
  }

  // 메트릭이 포함된 분석들 가져오기
  const analysesWithMetrics = await prisma.analysis.findMany({
    where: {
      id: { in: analyses.map(a => a.id) },
      userId,
      status: 'completed'
    },
    include: {
      metrics: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // 카테고리별 점수 계산
  const categories = {
    codeQuality: { label: 'Code Quality', percentage: 35, categoryName: 'code_quality' },
    projectStructure: { label: 'Project Structure', percentage: 30, categoryName: 'project_structure' },
    contributionPattern: { label: 'Contribution Pattern', percentage: 25, categoryName: 'activity' },
    skillAssessment: { label: 'Skill Assessment', percentage: 10, categoryName: 'languages' }
  };

  // 카테고리별 평균 점수 계산
  const categoryScores = {};

  Object.entries(categories).forEach(([key, config]) => {
    const categoryMetrics = [];

    // 모든 분석에서 해당 카테고리의 overall_score 수집
    analysesWithMetrics.forEach(analysis => {
      analysis.metrics.forEach(metric => {
        if (metric.category === config.categoryName && metric.name === 'overall_score') {
          categoryMetrics.push(metric.value);
        }
      });
    });

    // 카테고리별 총점 합산
    const totalScore = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, score) => sum + score, 0)
      : 0;

    categoryScores[key] = {
      percentage: config.percentage,
      score: convertScoreToBitByte(totalScore),
      label: config.label,
      improvement: "+0 bits"
    };
  });

  return categoryScores;
};

/**
 * 특정 카테고리의 메트릭 점수 가져오기
 */
const getMetricScore = (metrics, category) => {
  const categoryMetrics = metrics.filter(m => m.category === category);
  
  if (categoryMetrics.length === 0) return 0;
  
  const overallMetric = categoryMetrics.find(m => m.name === 'overall_score');
  if (overallMetric) return overallMetric.value;
  
  // overall_score가 없으면 평균 계산
  const sum = categoryMetrics.reduce((acc, m) => acc + m.value, 0);
  return sum / categoryMetrics.length;
};

/**
 * 시간별 점수 변화 계산
 */
const calculateVariation = async (analyses, period) => {
  const periodDays = parsePeriod(period);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);

  // 기간 내 분석 필터링
  const filteredAnalyses = analyses.filter(a => 
    a.completedAt && new Date(a.completedAt) >= cutoffDate
  );

  // 차트 데이터 생성
  const chartData = filteredAnalyses
    .reverse() // 오래된 것부터
    .map(analysis => ({
      date: analysis.completedAt.toISOString().split('T')[0],
      value: convertScoreToBitByte(analysis.score),
      formatted: formatDate(analysis.completedAt)
    }));

  // 성장률 계산 (총 bit로 계산)
  let growthData = {
    percentage: 0,
    absolute: "+0 bits",
    period: `last ${periodDays} days`
  };

  if (chartData.length >= 2) {
    const firstTotalBits = chartData[0].value.byte * 8 + chartData[0].value.bit;
    const lastTotalBits = chartData[chartData.length - 1].value.byte * 8 + chartData[chartData.length - 1].value.bit;
    const absoluteChange = Math.round(lastTotalBits - firstTotalBits);
    const percentageChange = firstTotalBits > 0 ? ((absoluteChange / firstTotalBits) * 100) : 0;

    growthData = {
      percentage: parseFloat(percentageChange.toFixed(1)),
      absolute: absoluteChange >= 0 ? `+${absoluteChange} bits` : `${absoluteChange} bits`,
      period: `last ${periodDays} days`
    };
  }

  return {
    chartData,
    growth: growthData
  };
};

/**
 * 랭킹 정보 구성
 */
const getRankingData = async (userId, userRankings) => {
  // 전체 사용자 수 조회
  const totalUsers = await prisma.user.count();

  // overall 카테고리 랭킹 조회
  const overallRanking = Array.isArray(userRankings) 
    ? userRankings.find(r => r.category === 'overall')
    : userRankings;

  const userPosition = overallRanking?.rank || totalUsers;
  const percentile = overallRanking?.percentile || 0;

  // 상위 랭커 조회
  const topRankings = await userRankingRepository.getTopRankings('overall', 10);

  const topUsers = topRankings.map((ranking, index) => ({
    rank: ranking.rank,
    userId: ranking.userId,
    username: ranking.user.username,
    name: ranking.user.name,
    avatarUrl: ranking.user.avatarUrl,
    score: convertScoreToBitByte(ranking.score),
    skillLevel: calculateSkillLevel(ranking.score),
    change: 0, // TODO: 이전 랭킹과 비교하여 변화 계산
    isCurrentUser: ranking.userId === userId
  }));

  return {
    userPosition,
    totalUsers,
    percentile: percentile ? parseFloat(percentile.toFixed(1)) : undefined,
    topUsers
  };
};

/**
 * 최근 활동 정보 구성
 */
const getRecentActivityData = async (activities, userStats, evaluationProjects) => {
  const lastEvaluationAt = userStats?.lastAnalysisAt?.toISOString() || null;
  
  // 이번 달 평가 횟수
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  const evaluationsThisMonth = activities.filter(
    a => a.type === 'analysis' && 
    a.action.includes('Completed') && 
    new Date(a.createdAt) >= currentMonth
  ).length;

  // 점수 향상 계산
  const completedAnalyses = await analysisRepository.findAll({
    userId: userStats?.userId,
    status: 'completed'
  });

  let scoreImprovement = "+0 bits";
  if (completedAnalyses.length >= 2) {
    const latestScore = completedAnalyses[0].score || 0;
    const previousScore = completedAnalyses[1].score || 0;
    const improvement = latestScore - previousScore;
    scoreImprovement = improvement >= 0 ? `+${improvement.toFixed(1)} bits` : `${improvement.toFixed(1)} bits`;
  }

  // 다음 추천 액션
  let nextRecommendedAction = "평가할 새 프로젝트 추가";
  if (evaluationProjects.length === 0) {
    nextRecommendedAction = "첫 번째 프로젝트를 추가하세요";
  } else if (evaluationProjects.length < MAX_PROJECTS_PER_USER) {
    nextRecommendedAction = "평가할 새 프로젝트 추가";
  } else {
    const pendingCount = evaluationProjects.filter(
      p => !p.analyses || p.analyses.length === 0 || 
      p.analyses[0].status === 'pending'
    ).length;
    
    if (pendingCount > 0) {
      nextRecommendedAction = "대기 중인 프로젝트 평가 시작";
    } else {
      nextRecommendedAction = "프로젝트 재평가 또는 새 프로젝트 추가";
    }
  }

  return {
    lastEvaluationAt,
    evaluationsThisMonth,
    scoreImprovement,
    nextRecommendedAction
  };
};

/**
 * 유틸리티 함수들
 */

// Tier system: 현실적인 점수 기준으로 조정
const TIERS = {
  INTERN: { max: 31, name: 'Intern', color: '#gray' },        // 0-31 bytes (0-248 bits)
  JUNIOR: { max: 83, name: 'Junior Dev', color: '#blue' },    // 32-83 bytes (256-664 bits)
  SENIOR: { max: 115, name: 'Senior Dev', color: '#purple' }, // 84-115 bytes (672-920 bits)
  ARCHITECT: { max: 128, name: 'Architect', color: '#gold' }  // 116+ bytes (928+ bits)
};

const calculateGrade = (bitScore) => {
  // Convert bit to byte (1 byte = 8 bits)
  const byteScore = Math.floor(bitScore / 8);
  
  if (byteScore >= 96) return 'A'; // 768+ bits
  if (byteScore >= 64) return 'B'; // 512+ bits
  if (byteScore >= 32) return 'C'; // 256+ bits
  if (byteScore >= 16) return 'D'; // 128+ bits
  return 'F';
};

const calculateSkillLevel = (bitScore) => {
  // Convert bit to byte (1 byte = 8 bits)
  const byteScore = Math.floor(bitScore / 8);
  
  if (byteScore > TIERS.SENIOR.max) return TIERS.ARCHITECT.name;
  if (byteScore > TIERS.JUNIOR.max) return TIERS.SENIOR.name;
  if (byteScore > TIERS.INTERN.max) return TIERS.JUNIOR.name;
  return TIERS.INTERN.name;
};

const calculateGrowth = (currentScore, previousScore) => {
  if (!previousScore) {
    return {
      percentage: 0,
      absolute: "+0 bits",
      period: "since last evaluation"
    };
  }

  const absoluteChange = currentScore - previousScore;
  const percentageChange = previousScore > 0 ? ((absoluteChange / previousScore) * 100) : 0;

  return {
    percentage: parseFloat(percentageChange.toFixed(1)),
    absolute: absoluteChange >= 0 ? `+${absoluteChange.toFixed(1)} bits` : `${absoluteChange.toFixed(1)} bits`,
    period: "since last evaluation"
  };
};

const parsePeriod = (period) => {
  const match = period.match(/^(\d+)([dmy])$/);
  if (!match) return 30; // 기본값

  const [, amount, unit] = match;
  const num = parseInt(amount, 10);

  switch (unit) {
    case 'd': return num;
    case 'm': return num * 30;
    case 'y': return num * 365;
    default: return 30;
  }
};

const formatDate = (date) => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

module.exports = {
  getDashboardData
};
