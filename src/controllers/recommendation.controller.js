const RecommendationService = require('../services/recommendation.service');
const { prisma } = require('../config/prisma');

class RecommendationController {
  constructor() {
    this.recommendationService = new RecommendationService();
  }

  getUserRecommendations = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { limit } = req.query;

      const recommendations = await this.recommendationService.getUserRecommendations(
        userId,
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  };

  getRecommendationsByAnalysis = async (req, res, next) => {
    try {
      const { analysisId } = req.params;
      const userId = req.user.id;

      // Verify user owns this analysis
      const analysis = await prisma.analysis.findFirst({
        where: {
          id: parseInt(analysisId),
          userId
        }
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }

      const recommendations = await this.recommendationService.getRecommendationsByAnalysis(
        parseInt(analysisId)
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  };

  getPersonalizedLearningPath = async (req, res, next) => {
    try {
      const userId = req.user.id;

      const learningPath = await this.recommendationService.getPersonalizedLearningPath(userId);

      res.json({
        success: true,
        data: {
          learningPath,
          message: learningPath.length > 0
            ? 'Personalized learning path generated based on your recent analyses'
            : 'Default learning path provided. Complete some analyses for personalized recommendations.'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  generateRecommendations = async (req, res, next) => {
    try {
      const { analysisId } = req.params;
      const { analysisData } = req.body;
      const userId = req.user.id;

      // Verify user owns this analysis
      const analysis = await prisma.analysis.findFirst({
        where: {
          id: parseInt(analysisId),
          userId
        }
      });

      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'Analysis not found'
        });
      }

      const recommendations = await this.recommendationService.generateRecommendationsForAnalysis(
        parseInt(analysisId),
        analysisData
      );

      res.json({
        success: true,
        data: recommendations,
        message: 'Recommendations generated successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = RecommendationController;