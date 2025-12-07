const analysisService = require('../services/analysis.service');
const enhancedAnalysisService = require('../services/enhancedAnalysis.service');

const startEvaluationAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { evaluationProjectId, evaluationProjectIds, analysisType = 'basic', options = {} } = req.body;

    // Support both single project (legacy) and multiple projects (new comprehensive analysis)
    if (!evaluationProjectId && !evaluationProjectIds) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation project ID(s) are required'
      });
    }

    let analysis;

    if (evaluationProjectIds && evaluationProjectIds.length > 0) {
      // New comprehensive analysis
      analysis = await enhancedAnalysisService.startComprehensiveAnalysis(userId, evaluationProjectIds, {
        ...options,
        analysisType
      });

      return res.status(202).json({
        success: true,
        data: {
          analysis: {
            id: analysis.analysisId,
            status: analysis.status,
            analysisType: 'comprehensive',
            projectsToAnalyze: analysis.projectsToAnalyze,
            estimatedDuration: analysis.overallEstimatedDuration,
            startedAt: analysis.startedAt,
            queuePosition: analysis.queuePosition
          }
        },
        message: 'Comprehensive analysis started successfully'
      });
    } else {
      // Legacy single project analysis
      analysis = await analysisService.startAnalysis(userId, parseInt(evaluationProjectId));

      return res.status(201).json({
        success: true,
        data: {
          analysis: {
            id: analysis.id,
            status: analysis.status,
            createdAt: analysis.createdAt
          }
        },
        message: 'Analysis started successfully'
      });
    }

  } catch (error) {
    console.error('Error starting evaluation analysis:', error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 'ANALYSIS_IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'ANALYSIS_IN_PROGRESS'
      });
    }

    next(error);
  }
};

const getAnalysisStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const analysisId = req.params.id;

    // Check if it's a numeric ID (legacy) or string ID (enhanced)
    const isLegacy = !isNaN(parseInt(analysisId));

    let analysis;
    if (isLegacy) {
      analysis = await analysisService.getAnalysisStatus(userId, parseInt(analysisId));

      res.json({
        success: true,
        data: {
          analysis: {
            id: analysis.id,
            status: analysis.status,
            score: analysis.score,
            grade: analysis.grade,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt,
            evaluationProject: {
              id: analysis.evaluationProject.id,
              repository: {
                name: analysis.evaluationProject.repository.name,
                fullName: analysis.evaluationProject.repository.fullName
              }
            }
          }
        }
      });
    } else {
      // Enhanced analysis
      analysis = await enhancedAnalysisService.getAnalysisStatus(userId, analysisId);

      res.json({
        success: true,
        data: {
          analysis: {
            id: analysis.id,
            status: analysis.status,
            analysisType: analysis.analysisType || 'comprehensive',
            score: analysis.totalScore,
            grade: analysis.grade,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt,
            progress: analysis.progress || 0,
            currentPhase: analysis.currentPhase,
            projectResults: analysis.projectResults || []
          }
        }
      });
    }

  } catch (error) {
    console.error('Error fetching analysis status:', error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

const getAnalysisResults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const analysisId = req.params.id;

    // Check if it's a numeric ID (legacy) or string ID (enhanced)
    const isLegacy = !isNaN(parseInt(analysisId));

    let analysis;
    if (isLegacy) {
      analysis = await analysisService.getAnalysisResults(userId, parseInt(analysisId));

      const metricsGrouped = analysis.metrics.reduce((acc, metric) => {
        if (!acc[metric.category]) {
          acc[metric.category] = [];
        }
        acc[metric.category].push({
          name: metric.name,
          value: metric.value,
          maxValue: metric.maxValue,
          weight: metric.weight
        });
        return acc;
      }, {});

      const recommendationsGrouped = analysis.recommendations.reduce((acc, rec) => {
        if (!acc[rec.category]) {
          acc[rec.category] = [];
        }
        acc[rec.category].push({
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          estimatedHours: rec.estimatedHours
        });
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          analysis: {
            id: analysis.id,
            status: analysis.status,
            score: analysis.score,
            grade: analysis.grade,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt,
            evaluationProject: {
              id: analysis.evaluationProject.id,
              repository: {
                name: analysis.evaluationProject.repository.name,
                fullName: analysis.evaluationProject.repository.fullName,
                description: analysis.evaluationProject.repository.description,
                language: analysis.evaluationProject.repository.language,
                stars: analysis.evaluationProject.repository.stars,
                forks: analysis.evaluationProject.repository.forks
              }
            },
            metrics: metricsGrouped,
            recommendations: recommendationsGrouped
          }
        }
      });
    } else {
      // Enhanced analysis
      analysis = await enhancedAnalysisService.getAnalysisResults(userId, analysisId);

      res.json({
        success: true,
        data: {
          analysis: {
            id: analysis.id,
            status: analysis.status,
            analysisType: analysis.analysisType || 'comprehensive',
            score: analysis.totalScore,
            grade: analysis.grade,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt,
            overallResults: analysis.overallResults,
            projectResults: analysis.projectResults,
            skillLevel: analysis.overallResults?.skillLevel,
            strongPoints: analysis.overallResults?.strongPoints,
            improvementAreas: analysis.overallResults?.improvementAreas,
            recommendations: analysis.overallResults?.recommendations
          }
        }
      });
    }

  } catch (error) {
    console.error('Error fetching analysis results:', error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 'ANALYSIS_NOT_COMPLETED') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'ANALYSIS_NOT_COMPLETED'
      });
    }

    next(error);
  }
};

module.exports = {
  startEvaluationAnalysis,
  getAnalysisStatus,
  getAnalysisResults
};