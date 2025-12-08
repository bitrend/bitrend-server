const prisma = require('../config/prisma');

const findAll = async (options = {}) => {
  const { skip, take, orderBy, where } = options;

  return await prisma.gitHubRepository.findMany({
    skip,
    take,
    orderBy,
    where
  });
};

const findById = async (id) => {
  return await prisma.gitHubRepository.findUnique({
    where: { id }
  });
};

const findByGithubId = async (githubId) => {
  return await prisma.gitHubRepository.findUnique({
    where: { githubId }
  });
};

const findByFullName = async (fullName) => {
  return await prisma.gitHubRepository.findUnique({
    where: { fullName }
  });
};

const create = async (repositoryData) => {
  return await prisma.gitHubRepository.create({
    data: repositoryData
  });
};

const createFromGithub = async (githubRepo) => {
  const now = new Date();
  const data = {
    githubId: githubRepo.id,
    name: githubRepo.name,
    fullName: githubRepo.full_name,
    description: githubRepo.description,
    language: githubRepo.language,
    stars: githubRepo.stargazers_count,
    forks: githubRepo.forks_count,
    size: githubRepo.size,
    private: githubRepo.private,
    url: githubRepo.html_url,
    cloneUrl: githubRepo.clone_url,
    // Use provided dates or default to current time
    createdAt: githubRepo.created_at ? new Date(githubRepo.created_at) : now,
    updatedAt: githubRepo.updated_at ? new Date(githubRepo.updated_at) : now
  };
  
  return await prisma.gitHubRepository.create({ data });
};

const upsertFromGithub = async (githubRepo) => {
  const now = new Date();
  const createData = {
    githubId: githubRepo.id,
    name: githubRepo.name,
    fullName: githubRepo.full_name,
    description: githubRepo.description,
    language: githubRepo.language,
    stars: githubRepo.stargazers_count,
    forks: githubRepo.forks_count,
    size: githubRepo.size,
    private: githubRepo.private,
    url: githubRepo.html_url,
    cloneUrl: githubRepo.clone_url,
    // Use provided dates or default to current time
    createdAt: githubRepo.created_at ? new Date(githubRepo.created_at) : now,
    updatedAt: githubRepo.updated_at ? new Date(githubRepo.updated_at) : now
  };
  
  const updateData = {
    name: githubRepo.name,
    fullName: githubRepo.full_name,
    description: githubRepo.description,
    language: githubRepo.language,
    stars: githubRepo.stargazers_count,
    forks: githubRepo.forks_count,
    size: githubRepo.size,
    private: githubRepo.private,
    url: githubRepo.html_url,
    cloneUrl: githubRepo.clone_url,
    updatedAt: githubRepo.updated_at ? new Date(githubRepo.updated_at) : now
  };
  
  return await prisma.gitHubRepository.upsert({
    where: { githubId: githubRepo.id },
    create: createData,
    update: updateData
  });
};

const update = async (id, updateData) => {
  return await prisma.gitHubRepository.update({
    where: { id },
    data: updateData
  });
};

const deleteById = async (id) => {
  return await prisma.gitHubRepository.delete({
    where: { id }
  });
};

module.exports = {
  findAll,
  findById,
  findByGithubId,
  findByFullName,
  create,
  createFromGithub,
  upsertFromGithub,
  update,
  deleteById
};