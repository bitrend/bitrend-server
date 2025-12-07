const prisma = require('../config/prisma');

const findAll = async (options = {}) => {
  const { userId, type, skip, take } = options;

  const where = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;

  return await prisma.userActivity.findMany({
    where,
    skip,
    take,
    include: {
      user: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id) => {
  return await prisma.userActivity.findUnique({
    where: { id },
    include: {
      user: true
    }
  });
};

const findByUserId = async (userId, options = {}) => {
  const { type, skip, take } = options;

  const where = { userId };
  if (type) where.type = type;

  return await prisma.userActivity.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' }
  });
};

const countByUserId = async (userId, type = null) => {
  const where = { userId };
  if (type) where.type = type;

  return await prisma.userActivity.count({ where });
};

const create = async (activityData) => {
  return await prisma.userActivity.create({
    data: activityData
  });
};

const logActivity = async (userId, type, action, metadata = null) => {
  return await prisma.userActivity.create({
    data: {
      userId,
      type,
      action,
      metadata
    }
  });
};

const deleteById = async (id) => {
  return await prisma.userActivity.delete({
    where: { id }
  });
};

const deleteOldActivities = async (olderThanDays = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return await prisma.userActivity.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });
};

module.exports = {
  findAll,
  findById,
  findByUserId,
  countByUserId,
  create,
  logActivity,
  deleteById,
  deleteOldActivities
};