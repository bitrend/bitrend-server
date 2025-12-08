const prisma = require('../config/prisma');

const findAll = async (options = {}) => {
  const { userId, status, skip, take } = options;

  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  return await prisma.analysis.findMany({
    where,
    skip,
    take,
    include: {
      evaluationProject: {
        include: {
          repository: true
        }
      },
      metrics: true,
      recommendations: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id) => {
  return await prisma.analysis.findUnique({
    where: { id },
    include: {
      evaluationProject: {
        include: {
          repository: true
        }
      },
      metrics: true,
      recommendations: true
    }
  });
};

const findByEvaluationProjectId = async (evaluationProjectId) => {
  return await prisma.analysis.findMany({
    where: { evaluationProjectId },
    include: {
      metrics: true,
      recommendations: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findLatestByProjectId = async (evaluationProjectId) => {
  return await prisma.analysis.findFirst({
    where: { evaluationProjectId },
    include: {
      metrics: true,
      recommendations: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const countByStatus = async (userId, status) => {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  return await prisma.analysis.count({ where });
};

const create = async (analysisData) => {
  return await prisma.analysis.create({
    data: analysisData,
    include: {
      evaluationProject: {
        include: {
          repository: true
        }
      }
    }
  });
};

const updateStatus = async (id, status, additionalData = {}) => {
  return await prisma.analysis.update({
    where: { id },
    data: {
      status,
      ...additionalData
    }
  });
};

const updateScore = async (id, score, grade) => {
  return await prisma.analysis.update({
    where: { id },
    data: {
      score,
      grade,
      completedAt: new Date(),
      status: 'completed'
    }
  });
};

const deleteById = async (id) => {
  return await prisma.analysis.delete({
    where: { id }
  });
};

const createMetric = async (metricData) => {
  return await prisma.analysisMetric.create({
    data: metricData
  });
};

const createMetrics = async (metricsData) => {
  return await prisma.analysisMetric.createMany({
    data: metricsData
  });
};

const createRecommendation = async (recommendationData) => {
  return await prisma.recommendation.create({
    data: recommendationData
  });
};

const createRecommendations = async (recommendationsData) => {
  return await prisma.recommendation.createMany({
    data: recommendationsData
  });
};

module.exports = {
  findAll,
  findById,
  findByEvaluationProjectId,
  findLatestByProjectId,
  countByStatus,
  create,
  updateStatus,
  updateScore,
  deleteById,
  createMetric,
  createMetrics,
  createRecommendation,
  createRecommendations
};