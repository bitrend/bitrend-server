const prisma = require('../config/prisma');

const findAll = async () => {
  return await prisma.user.findMany();
};

const findById = async (id) => {
  return await prisma.user.findUnique({
    where: { id }
  });
};

const findByGithubId = async (githubId) => {
  return await prisma.user.findUnique({
    where: { githubId }
  });
};

const create = async (userData) => {
  return await prisma.user.create({
    data: userData
  });
};

const createFromGithub = async (githubUser, accessToken) => {
  return await prisma.user.create({
    data: {
      githubId: githubUser.id,
      username: githubUser.login,
      name: githubUser.name,
      email: githubUser.email,
      avatarUrl: githubUser.avatar_url,
      accessToken: accessToken
    }
  });
};

const updateFromGithub = async (id, githubUser, accessToken) => {
  return await prisma.user.update({
    where: { id },
    data: {
      username: githubUser.login,
      name: githubUser.name,
      email: githubUser.email,
      avatarUrl: githubUser.avatar_url,
      accessToken: accessToken
    }
  });
};

const update = async (id, updateData) => {
  return await prisma.user.update({
    where: { id },
    data: updateData
  });
};

module.exports = {
  findAll,
  findById,
  findByGithubId,
  create,
  createFromGithub,
  updateFromGithub,
  update
};
