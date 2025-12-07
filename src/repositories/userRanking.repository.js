const prisma = require('../config/prisma');

const findAll = async (options = {}) => {
  const { category, skip, take } = options;

  const where = {};
  if (category) where.category = category;

  return await prisma.userRanking.findMany({
    where,
    skip,
    take,
    include: {
      user: true
    },
    orderBy: { rank: 'asc' }
  });
};

const findByUserId = async (userId, category = null) => {
  const where = { userId };
  if (category) where.category = category;

  return await prisma.userRanking.findMany({
    where,
    include: {
      user: true
    },
    orderBy: { rank: 'asc' }
  });
};

const findByCategory = async (category, options = {}) => {
  const { skip, take } = options;

  return await prisma.userRanking.findMany({
    where: { category },
    skip,
    take,
    include: {
      user: true
    },
    orderBy: { rank: 'asc' }
  });
};

const findUserRankByCategory = async (userId, category) => {
  return await prisma.userRanking.findUnique({
    where: {
      userId_category: { userId, category }
    },
    include: {
      user: true
    }
  });
};

const getTopRankings = async (category, limit = 10) => {
  return await prisma.userRanking.findMany({
    where: { category },
    take: limit,
    include: {
      user: true
    },
    orderBy: { rank: 'asc' }
  });
};

const create = async (rankingData) => {
  return await prisma.userRanking.create({
    data: rankingData
  });
};

const upsert = async (userId, category, score, rank, percentile) => {
  return await prisma.userRanking.upsert({
    where: {
      userId_category: { userId, category }
    },
    create: {
      userId,
      category,
      score,
      rank,
      percentile,
      calculatedAt: new Date()
    },
    update: {
      score,
      rank,
      percentile,
      calculatedAt: new Date()
    }
  });
};

const updateRanks = async (rankings) => {
  return await prisma.$transaction(
    rankings.map(({ userId, category, rank, score, percentile }) =>
      prisma.userRanking.upsert({
        where: {
          userId_category: { userId, category }
        },
        create: {
          userId,
          category,
          rank,
          score,
          percentile,
          calculatedAt: new Date()
        },
        update: {
          rank,
          score,
          percentile,
          calculatedAt: new Date()
        }
      })
    )
  );
};

const deleteByCategory = async (category) => {
  return await prisma.userRanking.deleteMany({
    where: { category }
  });
};

const deleteByUserId = async (userId) => {
  return await prisma.userRanking.deleteMany({
    where: { userId }
  });
};

const deleteOldRankings = async (olderThanDays = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return await prisma.userRanking.deleteMany({
    where: {
      calculatedAt: {
        lt: cutoffDate
      }
    }
  });
};

module.exports = {
  findAll,
  findByUserId,
  findByCategory,
  findUserRankByCategory,
  getTopRankings,
  create,
  upsert,
  updateRanks,
  deleteByCategory,
  deleteByUserId,
  deleteOldRankings
};