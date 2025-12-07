const evaluationProjectService = require('../services/evaluationProject.service');

const getProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projects = await evaluationProjectService.getProjectsByUserId(userId);

    res.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        maxProjects: 3
      }
    });

  } catch (error) {
    console.error('Error fetching evaluation projects:', error);
    next(error);
  }
};

const addProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { repository } = req.body;

    if (!repository) {
      return res.status(400).json({
        success: false,
        message: 'Repository data is required'
      });
    }

    const requiredFields = ['id', 'name', 'full_name'];
    const missingFields = requiredFields.filter(field => !repository[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required repository fields: ${missingFields.join(', ')}`
      });
    }

    const project = await evaluationProjectService.addProject(userId, repository);

    res.status(201).json({
      success: true,
      data: {
        project
      },
      message: 'Project added to evaluation list successfully'
    });

  } catch (error) {
    console.error('Error adding evaluation project:', error);

    if (error.code === 'MAX_PROJECTS_EXCEEDED') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'MAX_PROJECTS_EXCEEDED'
      });
    }

    if (error.code === 'PROJECT_ALREADY_EXISTS') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'PROJECT_ALREADY_EXISTS'
      });
    }

    next(error);
  }
};

const reorderProjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { projectOrders } = req.body;

    if (!projectOrders || !Array.isArray(projectOrders)) {
      return res.status(400).json({
        success: false,
        message: 'Project orders array is required'
      });
    }

    const invalidOrders = projectOrders.filter(order =>
      !order.id || typeof order.order !== 'number'
    );

    if (invalidOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Each project order must have id and order fields'
      });
    }

    const reorderedProjects = await evaluationProjectService.updateProjectOrder(userId, projectOrders);

    res.json({
      success: true,
      data: {
        projects: reorderedProjects
      },
      message: 'Project order updated successfully'
    });

  } catch (error) {
    console.error('Error reordering evaluation projects:', error);
    next(error);
  }
};

const removeProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = parseInt(req.params.id);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    await evaluationProjectService.removeProject(userId, projectId);

    res.json({
      success: true,
      message: 'Project removed from evaluation list successfully'
    });

  } catch (error) {
    console.error('Error removing evaluation project:', error);

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

const getProjectById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const projectId = parseInt(req.params.id);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid project ID is required'
      });
    }

    const project = await evaluationProjectService.getProjectById(userId, projectId);

    res.json({
      success: true,
      data: {
        project
      }
    });

  } catch (error) {
    console.error('Error fetching evaluation project:', error);

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

module.exports = {
  getProjects,
  addProject,
  reorderProjects,
  removeProject,
  getProjectById
};