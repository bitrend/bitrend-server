const prisma = require('../config/prisma');

const findAll = async (userId) => {
  return await prisma.evaluationProject.findMany({
    where: { userId },
    include: {
      repository: true
    },
    orderBy: { order: 'asc' }
  });
};

const findById = async (id) => {
  return await prisma.evaluationProject.findUnique({
    where: { id },
    include: {
      user: true,
      repository: true,
      analyses: true
    }
  });
};

const findByUserId = async (userId) => {
  return await prisma.evaluationProject.findMany({
    where: { userId },
    include: {
      repository: true,
      analyses: true
    },
    orderBy: { order: 'asc' }
  });
};

const findByUserAndRepository = async (userId, repositoryId) => {
  return await prisma.evaluationProject.findUnique({
    where: {
      userId_repositoryId: { userId, repositoryId }
    },
    include: {
      repository: true,
      analyses: true
    }
  });
};

const countByUserId = async (userId) => {
  return await prisma.evaluationProject.count({
    where: { userId }
  });
};

const create = async (projectData) => {
  return await prisma.evaluationProject.create({
    data: projectData,
    include: {
      repository: true
    }
  });
};

const createWithMaxOrder = async (userId, repositoryId) => {
  const maxOrder = await prisma.evaluationProject.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
    select: { order: true }
  });

  return await prisma.evaluationProject.create({
    data: {
      userId,
      repositoryId,
      order: (maxOrder?.order ?? 0) + 1
    },
    include: {
      repository: true
    }
  });
};

const updateOrder = async (id, newOrder) => {
  return await prisma.evaluationProject.update({
    where: { id },
    data: { order: newOrder },
    include: {
      repository: true
    }
  });
};

const reorderProjects = async (userId, projectOrders) => {
  return await prisma.$transaction(
    projectOrders.map(({ id, order }) =>
      prisma.evaluationProject.update({
        where: { id },
        data: { order }
      })
    )
  );
};

const deleteById = async (id) => {
  return await prisma.evaluationProject.delete({
    where: { id }
  });
};

const deleteByUserId = async (userId) => {
  return await prisma.evaluationProject.deleteMany({
    where: { userId }
  });
};

module.exports = {
  findAll,
  findById,
  findByUserId,
  findByUserAndRepository,
  countByUserId,
  create,
  createWithMaxOrder,
  updateOrder,
  reorderProjects,
  deleteById,
  deleteByUserId
};