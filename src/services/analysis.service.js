const analysisRepository = require('../repositories/analysis.repository');
const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const githubService = require('./github.service');
const enhancedAnalysisService = require('./enhancedAnalysis.service');
const aiService = require('./ai.service');
const userStatsRepository = require('../repositories/userStats.repository');
const userActivityRepository = require('../repositories/userActivity.repository');

// Bit/Byte scoring system: 1024 bit = 128 byte
const MAX_SCORE_BIT = 1024;
const MAX_SCORE_BYTE = 128;

const startAnalysis = async (userId, evaluationProjectId) => {
  try {
    const evaluationProject = await evaluationProjectRepository.findById(evaluationProjectId);

    if (!evaluationProject) {
      const error = new Error('Evaluation project not found');
      error.statusCode = 404;
      throw error;
    }

    if (evaluationProject.userId !== userId) {
      const error = new Error('Unauthorized to analyze this project');
      error.statusCode = 403;
      throw error;
    }

    const existingAnalysis = await analysisRepository.findLatestByProjectId(evaluationProjectId);

    if (existingAnalysis && existingAnalysis.status === 'pending') {
      const error = new Error('Analysis already in progress for this project');
      error.statusCode = 400;
      error.code = 'ANALYSIS_IN_PROGRESS';
      throw error;
    }

    const analysis = await analysisRepository.create({
      userId,
      evaluationProjectId,
      status: 'pending'
    });

    setImmediate(() => {
      performAnalysis(analysis.id, evaluationProject).catch(error => {
        console.error('Analysis failed:', error);
      });
    });

    await userActivityRepository.logActivity(
      userId,
      'analysis',
      `Started analysis for project "${evaluationProject.repository.name}"`,
      {
        analysisId: analysis.id,
        evaluationProjectId,
        repositoryName: evaluationProject.repository.name
      }
    );

    return analysis;
  } catch (error) {
    console.error('Error starting analysis:', error);
    throw error;
  }
};

const performAnalysis = async (analysisId, evaluationProject) => {
  try {
    await analysisRepository.updateStatus(analysisId, 'processing');

    const repository = evaluationProject.repository;
    const [owner, repo] = repository.fullName.split('/');

    const user = evaluationProject.user;

    if (!user.accessToken) {
      throw new Error('GitHub access token not found');
    }

    // GitHub 데이터 수집
    const [languages, stats, files, fileStructure, packageJson] = await Promise.allSettled([
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken),
      githubService.getRepositoryFiles(owner, repo, user.accessToken, 10), // 최대 10개 파일
      githubService.getRepositoryStructure(owner, repo, user.accessToken),
      githubService.getPackageJson(owner, repo, user.accessToken)
    ]);

    const metrics = [];
    const languageStats = languages.value || [];
    const repoStats = stats.value || {};
    const fileContents = files.value || [];
    const structure = fileStructure.value || [];
    const packageData = packageJson.value || null;

    // AI 분석 활성화 여부 확인
    const useAI = aiService.isEnabled();

    // 1. Code Quality Analysis (35% weight, max 358.4 bits)
    let codeQualityScore = 0;
    if (useAI) {
      const aiQuality = await aiService.analyzeCodeQuality(repository, fileContents, languageStats);
      codeQualityScore = (aiQuality.score / 100) * 358.4; // Convert to bits
      
      metrics.push({
        category: 'code_quality',
        name: 'maintainability_index',
        value: aiQuality.metrics.maintainabilityIndex,
        maxValue: 100,
        weight: 0.1
      });
      
      metrics.push({
        category: 'code_quality',
        name: 'overall_score',
        value: codeQualityScore,
        maxValue: 358.4,
        weight: 0.35
      });
    } else {
      codeQualityScore = calculateCodeQuality(repository, languageStats, repoStats);
      metrics.push({
        category: 'code_quality',
        name: 'overall_score',
        value: codeQualityScore,
        maxValue: 358.4,
        weight: 0.35
      });
    }

    // 2. Project Structure Analysis (30% weight, max 307.2 bits)
    let projectStructureScore = 0;
    if (useAI) {
      const aiStructure = await aiService.analyzeProjectStructure(repository, structure, packageData);
      projectStructureScore = (aiStructure.score / 100) * 307.2; // Convert to bits
      
      metrics.push({
        category: 'project_structure',
        name: 'architecture_score',
        value: aiStructure.metrics.architectureScore,
        maxValue: 100,
        weight: 0.08
      });
      
      metrics.push({
        category: 'project_structure',
        name: 'overall_score',
        value: projectStructureScore,
        maxValue: 307.2,
        weight: 0.30
      });
    } else {
      projectStructureScore = calculateProjectStructure(repository, repoStats);
      metrics.push({
        category: 'project_structure',
        name: 'overall_score',
        value: projectStructureScore,
        maxValue: 307.2,
        weight: 0.30
      });
    }

    // 3. Contribution Pattern / Activity (25% weight, max 256 bits)
    const activityScore = calculateActivity(repository, repoStats);
    metrics.push({
      category: 'activity',
      name: 'overall_score',
      value: activityScore,
      maxValue: 256,
      weight: 0.25
    });

    // 4. Skill Assessment (10% weight, max 102.4 bits)
    let skillScore = 0;
    if (useAI) {
      const technicalIndicators = {
        commits: repoStats.totalCommits || 0,
        contributors: repoStats.contributorsCount || 1,
        languages: languageStats,
        hasTests: structure.some(f => f.path.includes('test') || f.path.includes('spec')),
        hasCI: structure.some(f => f.path.includes('.github/workflows') || f.path.includes('.gitlab-ci'))
      };
      
      const aiSkill = await aiService.analyzeSkillAssessment(repository, technicalIndicators);
      skillScore = (aiSkill.score / 100) * 102.4; // Convert to bits
      
      metrics.push({
        category: 'languages',
        name: 'skill_level',
        value: skillScore,
        maxValue: 102.4,
        weight: 0.10
      });
    } else {
      skillScore = calculateSkillScore(languageStats);
      metrics.push({
        category: 'languages',
        name: 'skill_level',
        value: skillScore,
        maxValue: 102.4,
        weight: 0.10
      });
    }

    // 총점 계산 (bits)
    const totalScoreBit = codeQualityScore + projectStructureScore + activityScore + skillScore;
    const grade = calculateGradeFromBits(totalScoreBit);

    await analysisRepository.createMetrics(
      metrics.map(metric => ({
        analysisId,
        ...metric
      }))
    );

    // AI 기반 추천사항 생성
    let recommendations = [];
    if (useAI) {
      const allMetrics = {
        codeQuality: codeQualityScore,
        projectStructure: projectStructureScore,
        activity: activityScore,
        skill: skillScore,
        totalBit: totalScoreBit,
        grade
      };
      
      const aiRecommendations = await aiService.generateRecommendations(
        repository,
        allMetrics,
        languageStats
      );
      
      recommendations = aiRecommendations.map(rec => ({
        category: rec.category,
        title: rec.title,
        description: rec.description,
        priority: rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1,
        estimatedHours: rec.timeframe ? estimateHours(rec.timeframe) : null
      }));
    } else {
      recommendations = generateRecommendations(metrics, repository);
    }

    if (recommendations.length > 0) {
      await analysisRepository.createRecommendations(
        recommendations.map(rec => ({
          analysisId,
          ...rec
        }))
      );
    }

    await analysisRepository.updateScore(analysisId, totalScoreBit, grade);

    await userStatsRepository.incrementAnalyses(evaluationProject.userId, totalScoreBit);

    await userActivityRepository.logActivity(
      evaluationProject.userId,
      'analysis',
      `Completed analysis for project "${repository.name}" (Score: ${totalScoreBit.toFixed(1)} bits / ${(totalScoreBit / 8).toFixed(2)} bytes, Grade: ${grade})`,
      {
        analysisId,
        score: totalScoreBit,
        grade,
        repositoryName: repository.name
      }
    );

  } catch (error) {
    console.error('Analysis processing failed:', error);

    await analysisRepository.updateStatus(analysisId, 'failed', {
      completedAt: new Date()
    });

    await userActivityRepository.logActivity(
      evaluationProject.userId,
      'analysis',
      `Analysis failed for project "${evaluationProject.repository.name}"`,
      {
        analysisId,
        error: error.message,
        repositoryName: evaluationProject.repository.name
      }
    );
  }
};

// Fallback 계산 함수들 (AI 없을 때 사용, bit 단위 반환)
const calculateCodeQuality = (repository, languages, stats) => {
  let score = 50; // 0-100 scale

  if (repository.description) score += 10;
  if (languages.length > 0) score += 15;
  if (repository.stars > 5) score += 10;
  if (repository.stars > 20) score += 5;
  if (stats?.contributorsCount > 1) score += 10;

  score = Math.min(score, 100);
  
  // Convert to bits (35% of 1024 bits = 358.4 bits max)
  return (score / 100) * 358.4;
};

const calculateProjectStructure = (repository, stats) => {
  let score = 40; // 0-100 scale

  if (repository.size > 100) score += 15;
  if (repository.language) score += 20;
  if (stats?.totalCommits > 10) score += 15;
  if (stats?.totalCommits > 50) score += 10;

  score = Math.min(score, 100);
  
  // Convert to bits (30% of 1024 bits = 307.2 bits max)
  return (score / 100) * 307.2;
};

const calculateActivity = (repository, stats) => {
  let score = 30; // 0-100 scale

  const lastUpdate = new Date(repository.updatedAt);
  const now = new Date();
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate < 30) score += 30;
  else if (daysSinceUpdate < 90) score += 20;
  else if (daysSinceUpdate < 180) score += 10;

  if (stats?.totalCommits > 0) score += 20;
  if (repository.forks > 0) score += 10;
  if (repository.stars > 0) score += 10;

  score = Math.min(score, 100);
  
  // Convert to bits (25% of 1024 bits = 256 bits max)
  return (score / 100) * 256;
};

const calculateSkillScore = (languages) => {
  let score = 50; // 0-100 scale

  // 언어 다양성
  if (languages.length >= 3) score += 25;
  else if (languages.length >= 2) score += 15;
  else if (languages.length >= 1) score += 5;

  // 주요 언어 사용률
  if (languages.length > 0) {
    const mainLanguage = languages[0];
    if (mainLanguage.percentage > 80) score += 15;
    else if (mainLanguage.percentage > 60) score += 20; // 균형잡힌 것이 더 좋음
    else score += 10;
  }

  score = Math.min(score, 100);
  
  // Convert to bits (10% of 1024 bits = 102.4 bits max)
  return (score / 100) * 102.4;
};

const calculateGradeFromBits = (bitScore) => {
  // Convert bit to byte (1 byte = 8 bits)
  const byteScore = Math.floor(bitScore / 8);
  
  if (byteScore >= 96) return 'A'; // 768+ bits
  if (byteScore >= 64) return 'B'; // 512+ bits
  if (byteScore >= 32) return 'C'; // 256+ bits
  if (byteScore >= 16) return 'D'; // 128+ bits
  return 'F';
};

const estimateHours = (timeframe) => {
  const timeframeMap = {
    'immediate': 1,
    '1-2 hours': 2,
    '2-4 hours': 3,
    '4-8 hours': 6,
    '1-2 days': 12,
    '2-5 days': 24,
    '1 week': 40,
    '2 weeks': 80
  };
  
  return timeframeMap[timeframe] || null;
};

const generateRecommendations = (metrics, repository) => {
  const recommendations = [];

  const codeQualityMetric = metrics.find(m => m.category === 'code_quality');
  if (codeQualityMetric && codeQualityMetric.value < 70) {
    recommendations.push({
      category: 'code_quality',
      title: 'Improve Code Quality',
      description: 'Consider adding more documentation, tests, and following coding best practices.',
      priority: 1,
      estimatedHours: 8
    });
  }

  const projectStructureMetric = metrics.find(m => m.category === 'project_structure');
  if (projectStructureMetric && projectStructureMetric.value < 70) {
    recommendations.push({
      category: 'project_structure',
      title: 'Enhance Project Structure',
      description: 'Organize code into logical modules and improve project architecture.',
      priority: 2,
      estimatedHours: 12
    });
  }

  const activityMetric = metrics.find(m => m.category === 'activity');
  if (activityMetric && activityMetric.value < 50) {
    recommendations.push({
      category: 'activity',
      title: 'Increase Project Activity',
      description: 'Make regular commits and updates to keep the project active.',
      priority: 3,
      estimatedHours: 4
    });
  }

  if (!repository.description) {
    recommendations.push({
      category: 'documentation',
      title: 'Add Project Description',
      description: 'Add a clear description to help others understand your project.',
      priority: 1,
      estimatedHours: 1
    });
  }

  return recommendations;
};

const getAnalysisStatus = async (userId, analysisId) => {
  try {
    const analysis = await analysisRepository.findById(analysisId);

    if (!analysis) {
      const error = new Error('Analysis not found');
      error.statusCode = 404;
      throw error;
    }

    if (analysis.userId !== userId) {
      const error = new Error('Unauthorized to access this analysis');
      error.statusCode = 403;
      throw error;
    }

    return analysis;
  } catch (error) {
    console.error('Error fetching analysis status:', error);
    throw error;
  }
};

const getAnalysisResults = async (userId, analysisId) => {
  try {
    const analysis = await getAnalysisStatus(userId, analysisId);

    if (analysis.status !== 'completed') {
      const error = new Error('Analysis is not completed yet');
      error.statusCode = 400;
      error.code = 'ANALYSIS_NOT_COMPLETED';
      throw error;
    }

    return analysis;
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    throw error;
  }
};

const startComprehensiveAnalysis = async (userId, evaluationProjectIds, options = {}) => {
  return await enhancedAnalysisService.startComprehensiveAnalysis(userId, evaluationProjectIds, options);
};

const getComprehensiveAnalysisStatus = async (userId, analysisId) => {
  return await enhancedAnalysisService.getAnalysisStatus(userId, analysisId);
};

const getComprehensiveAnalysisResults = async (userId, analysisId) => {
  return await enhancedAnalysisService.getAnalysisResults(userId, analysisId);
};

module.exports = {
  startAnalysis,
  getAnalysisStatus,
  getAnalysisResults,
  startComprehensiveAnalysis,
  getComprehensiveAnalysisStatus,
  getComprehensiveAnalysisResults
};