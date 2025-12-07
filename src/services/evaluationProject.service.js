const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const githubRepositoryRepository = require('../repositories/githubRepository.repository');
const userStatsRepository = require('../repositories/userStats.repository');
const userActivityRepository = require('../repositories/userActivity.repository');

const MAX_PROJECTS_PER_USER = 3;

const getProjectsByUserId = async (userId) => {
  try {
    return await evaluationProjectRepository.findByUserId(userId);
  } catch (error) {
    console.error('Error fetching evaluation projects:', error);
    throw error;
  }
};

const addProject = async (userId, githubRepositoryData) => {
  try {
    const projectCount = await evaluationProjectRepository.countByUserId(userId);

    if (projectCount >= MAX_PROJECTS_PER_USER) {
      const error = new Error(`Maximum ${MAX_PROJECTS_PER_USER} projects allowed per user`);
      error.statusCode = 400;
      error.code = 'MAX_PROJECTS_EXCEEDED';
      throw error;
    }

    const existingProject = await evaluationProjectRepository.findByUserAndRepository(
      userId,
      githubRepositoryData.id
    );

    if (existingProject) {
      const error = new Error('Project already added to evaluation list');
      error.statusCode = 400;
      error.code = 'PROJECT_ALREADY_EXISTS';
      throw error;
    }

    let repository = await githubRepositoryRepository.findByGithubId(githubRepositoryData.id);

    if (!repository) {
      repository = await githubRepositoryRepository.createFromGithub(githubRepositoryData);
    } else {
      repository = await githubRepositoryRepository.upsertFromGithub(githubRepositoryData);
    }

    const project = await evaluationProjectRepository.createWithMaxOrder(userId, repository.id);

    await userStatsRepository.incrementProjects(userId);

    await userActivityRepository.logActivity(
      userId,
      'project',
      `Added project "${repository.name}" to evaluation list`,
      {
        repositoryId: repository.id,
        repositoryName: repository.name,
        repositoryFullName: repository.fullName
      }
    );

    return project;
  } catch (error) {
    console.error('Error adding evaluation project:', error);
    throw error;
  }
};

const updateProjectOrder = async (userId, projectOrders) => {
  try {
    const userProjects = await evaluationProjectRepository.findByUserId(userId);

    const projectOrdersMap = new Map(projectOrders.map(order => [order.id, order.order]));

    const validOrders = userProjects
      .filter(project => projectOrdersMap.has(project.id))
      .map(project => ({
        id: project.id,
        order: projectOrdersMap.get(project.id)
      }));

    if (validOrders.length === 0) {
      const error = new Error('No valid project orders provided');
      error.statusCode = 400;
      throw error;
    }

    const orderedProjects = validOrders.sort((a, b) => a.order - b.order);

    const reorderedProjects = await evaluationProjectRepository.reorderProjects(userId, orderedProjects);

    await userActivityRepository.logActivity(
      userId,
      'project',
      'Reordered evaluation projects',
      {
        projectCount: orderedProjects.length,
        newOrder: orderedProjects.map(p => p.id)
      }
    );

    return reorderedProjects;
  } catch (error) {
    console.error('Error updating project order:', error);
    throw error;
  }
};

const removeProject = async (userId, projectId) => {
  try {
    const project = await evaluationProjectRepository.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (project.userId !== userId) {
      const error = new Error('Unauthorized to delete this project');
      error.statusCode = 403;
      throw error;
    }

    await evaluationProjectRepository.deleteById(projectId);

    await userActivityRepository.logActivity(
      userId,
      'project',
      `Removed project "${project.repository.name}" from evaluation list`,
      {
        repositoryId: project.repository.id,
        repositoryName: project.repository.name,
        repositoryFullName: project.repository.fullName
      }
    );

    const remainingCount = await evaluationProjectRepository.countByUserId(userId);

    await userStatsRepository.upsert(userId, {
      totalProjects: remainingCount
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing evaluation project:', error);
    throw error;
  }
};

const getProjectById = async (userId, projectId) => {
  try {
    const project = await evaluationProjectRepository.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    if (project.userId !== userId) {
      const error = new Error('Unauthorized to access this project');
      error.statusCode = 403;
      throw error;
    }

    return project;
  } catch (error) {
    console.error('Error fetching evaluation project:', error);
    throw error;
  }
};

module.exports = {
  getProjectsByUserId,
  addProject,
  updateProjectOrder,
  removeProject,
  getProjectById
};