const analysisRepository = require('../repositories/analysis.repository');
const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const githubService = require('./github.service');
const enhancedAnalysisService = require('./enhancedAnalysis.service');
const userStatsRepository = require('../repositories/userStats.repository');
const userActivityRepository = require('../repositories/userActivity.repository');

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

    const metrics = [];

    const [languages, stats] = await Promise.allSettled([
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken)
    ]);

    const codeQualityScore = calculateCodeQuality(repository, languages.value || [], stats.value);
    metrics.push({
      category: 'code_quality',
      name: 'overall_score',
      value: codeQualityScore,
      maxValue: 100,
      weight: 0.4
    });

    const projectStructureScore = calculateProjectStructure(repository, stats.value);
    metrics.push({
      category: 'project_structure',
      name: 'overall_score',
      value: projectStructureScore,
      maxValue: 100,
      weight: 0.3
    });

    const activityScore = calculateActivity(repository, stats.value);
    metrics.push({
      category: 'activity',
      name: 'overall_score',
      value: activityScore,
      maxValue: 100,
      weight: 0.3
    });

    if (languages.value) {
      languages.value.forEach((lang, index) => {
        if (index < 3) {
          metrics.push({
            category: 'languages',
            name: lang.language.toLowerCase(),
            value: parseFloat(lang.percentage),
            maxValue: 100,
            weight: 0.1
          });
        }
      });
    }

    const totalScore = calculateTotalScore(metrics);
    const grade = calculateGrade(totalScore);

    await analysisRepository.createMetrics(
      metrics.map(metric => ({
        analysisId,
        ...metric
      }))
    );

    const recommendations = generateRecommendations(metrics, repository);

    if (recommendations.length > 0) {
      await analysisRepository.createRecommendations(
        recommendations.map(rec => ({
          analysisId,
          ...rec
        }))
      );
    }

    await analysisRepository.updateScore(analysisId, totalScore, grade);

    await userStatsRepository.incrementAnalyses(evaluationProject.userId, totalScore);

    await userActivityRepository.logActivity(
      evaluationProject.userId,
      'analysis',
      `Completed analysis for project "${repository.name}" (Score: ${totalScore.toFixed(1)}, Grade: ${grade})`,
      {
        analysisId,
        score: totalScore,
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

const calculateCodeQuality = (repository, languages, stats) => {
  let score = 50;

  if (repository.description) score += 10;

  if (languages.length > 0) score += 15;

  if (repository.stars > 5) score += 10;
  if (repository.stars > 20) score += 5;

  if (stats?.contributorsCount > 1) score += 10;

  return Math.min(score, 100);
};

const calculateProjectStructure = (repository, stats) => {
  let score = 40;

  if (repository.size > 100) score += 15;

  if (repository.language) score += 20;

  if (stats?.totalCommits > 10) score += 15;
  if (stats?.totalCommits > 50) score += 10;

  return Math.min(score, 100);
};

const calculateActivity = (repository, stats) => {
  let score = 30;

  const lastUpdate = new Date(repository.updatedAt);
  const now = new Date();
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate < 30) score += 30;
  else if (daysSinceUpdate < 90) score += 20;
  else if (daysSinceUpdate < 180) score += 10;

  if (stats?.totalCommits > 0) score += 20;

  if (repository.forks > 0) score += 10;

  if (repository.stars > 0) score += 10;

  return Math.min(score, 100);
};

const calculateTotalScore = (metrics) => {
  const weightedSum = metrics.reduce((sum, metric) => {
    return sum + (metric.value * metric.weight);
  }, 0);

  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
};

const calculateGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
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