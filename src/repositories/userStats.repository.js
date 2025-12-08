const prisma = require('../config/prisma');

const findAll = async (options = {}) => {
  const { skip, take, orderBy } = options;

  return await prisma.userStats.findMany({
    skip,
    take,
    orderBy,
    include: {
      user: true
    }
  });
};

const findByUserId = async (userId) => {
  return await prisma.userStats.findUnique({
    where: { userId },
    include: {
      user: true
    }
  });
};

const create = async (userId) => {
  return await prisma.userStats.create({
    data: {
      userId,
      totalProjects: 0,
      completedAnalyses: 0,
      averageScore: null,
      lastAnalysisAt: null
    }
  });
};

const upsert = async (userId, statsData) => {
  return await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      ...statsData
    },
    update: statsData
  });
};

const incrementProjects = async (userId) => {
  return await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalProjects: 1,
      completedAnalyses: 0
    },
    update: {
      totalProjects: {
        increment: 1
      }
    }
  });
};

const incrementAnalyses = async (userId, score = null) => {
  const updateData = {
    completedAnalyses: {
      increment: 1
    },
    lastAnalysisAt: new Date()
  };

  if (score !== null) {
    const currentStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (currentStats) {
      const currentAverage = currentStats.averageScore || 0;
      const currentCount = currentStats.completedAnalyses;
      const newAverage = (currentAverage * currentCount + score) / (currentCount + 1);
      updateData.averageScore = newAverage;
    } else {
      updateData.averageScore = score;
    }
  }

  return await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalProjects: 0,
      completedAnalyses: 1,
      averageScore: score,
      lastAnalysisAt: new Date()
    },
    update: updateData
  });
};

const updateAverageScore = async (userId) => {
  const analyses = await prisma.analysis.findMany({
    where: {
      userId,
      status: 'completed',
      score: { not: null }
    },
    select: { score: true }
  });

  if (analyses.length === 0) {
    return await prisma.userStats.update({
      where: { userId },
      data: { averageScore: null }
    });
  }

  const averageScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0) / analyses.length;

  return await prisma.userStats.update({
    where: { userId },
    data: {
      averageScore,
      completedAnalyses: analyses.length
    }
  });
};

const deleteByUserId = async (userId) => {
  return await prisma.userStats.delete({
    where: { userId }
  });
};

module.exports = {
  findAll,
  findByUserId,
  create,
  upsert,
  incrementProjects,
  incrementAnalyses,
  updateAverageScore,
  deleteByUserId
};