const analysisService = require('../services/analysis.service');

const startEvaluationAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { evaluationProjectId } = req.body;

    if (!evaluationProjectId) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation project ID is required'
      });
    }

    const analysis = await analysisService.startAnalysis(userId, parseInt(evaluationProjectId));

    res.status(201).json({
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
    const analysisId = parseInt(req.params.id);

    if (!analysisId || isNaN(analysisId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid analysis ID is required'
      });
    }

    const analysis = await analysisService.getAnalysisStatus(userId, analysisId);

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
    const analysisId = parseInt(req.params.id);

    if (!analysisId || isNaN(analysisId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid analysis ID is required'
      });
    }

    const analysis = await analysisService.getAnalysisResults(userId, analysisId);

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