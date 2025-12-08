const evaluationProjectService = require('../services/evaluationProject.service');
const githubService = require('../services/github.service');

const getProjects = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user.id;

    if (!user.accessToken) {
      return res.status(401).json({
        evaluationProjects: [],
        maxProjects: 3,
        currentCount: 0,
        availableSlots: 3
      });
    }

    // Get all GitHub repositories for the user
    const githubRepositories = await githubService.getUserRepositories(
      user.username,
      user.accessToken,
      { per_page: 100, type: 'all', sort: 'updated', direction: 'desc' }
    );

    // Get evaluation projects (selected for evaluation)
    const evaluationProjects = await evaluationProjectService.getProjectsByUserId(userId);

    // Create a map of evaluation projects by GitHub repo ID for quick lookup
    const evaluationMap = new Map();
    evaluationProjects.forEach(project => {
      evaluationMap.set(project.repository.githubId.toString(), project);
    });

    // Transform all GitHub repositories to match frontend expectations
    const allProjects = githubRepositories.map(repo => {
      const evaluationProject = evaluationMap.get(repo.id.toString());
      const latestAnalysis = evaluationProject?.analyses && evaluationProject.analyses.length > 0
        ? evaluationProject.analyses[evaluationProject.analyses.length - 1]
        : null;

      return {
        id: evaluationProject ? evaluationProject.id.toString() : `github-${repo.id}`,
        githubRepo: {
          id: repo.id.toString(),
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || '',
          isPublic: !repo.private,
          language: repo.language || 'Unknown',
          license: null, // TODO: Add license field
          updatedAt: repo.updated_at,
          githubUrl: repo.html_url,
          stats: {
            commits: 0, // TODO: Add commits count from GitHub API
            contributors: 0, // TODO: Add contributors count from GitHub API
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            size: repo.size || 0
          }
        },
        evaluationStatus: evaluationProject
          ? (latestAnalysis ? latestAnalysis.status : 'pending')
          : null, // null means not selected for evaluation
        evaluationScore: latestAnalysis ? latestAnalysis.score : undefined,
        evaluationGrade: latestAnalysis ? latestAnalysis.grade : undefined,
        addedAt: evaluationProject ? evaluationProject.createdAt.toISOString() : undefined,
        lastEvaluatedAt: latestAnalysis ? latestAnalysis.completedAt?.toISOString() : undefined,
        priority: evaluationProject ? evaluationProject.order : 0,
        isSelected: !!evaluationProject // Whether this repo is selected for evaluation
      };
    });

    // Calculate overall statistics for selected projects only
    const selectedProjects = allProjects.filter(p => p.isSelected);
    const completedAnalyses = selectedProjects.filter(p => p.evaluationStatus === 'completed');

    const overallScore = completedAnalyses.length > 0
      ? completedAnalyses.reduce((sum, p) => sum + (p.evaluationScore || 0), 0) / completedAnalyses.length
      : undefined;

    const lastEvaluatedAt = completedAnalyses.length > 0
      ? Math.max(...completedAnalyses.map(p =>
          p.lastEvaluatedAt ? new Date(p.lastEvaluatedAt).getTime() : 0
        ))
      : undefined;

    res.json({
      evaluationProjects: allProjects,
      maxProjects: 3,
      currentCount: selectedProjects.length,
      availableSlots: 3 - selectedProjects.length,
      overallScore,
      lastEvaluatedAt: lastEvaluatedAt ? new Date(lastEvaluatedAt).toISOString() : undefined
    });

  } catch (error) {
    console.error('Error fetching evaluation projects:', error);

    if (error.code === 'UNAUTHORIZED') {
      return res.status(401).json({
        evaluationProjects: [],
        maxProjects: 3,
        currentCount: 0,
        availableSlots: 3
      });
    }

    if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        evaluationProjects: [],
        maxProjects: 3,
        currentCount: 0,
        availableSlots: 3
      });
    }

    // Fallback response to prevent frontend crashes
    return res.status(500).json({
      evaluationProjects: [],
      maxProjects: 3,
      currentCount: 0,
      availableSlots: 3
    });
  }
};

const addProject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { githubRepoId, githubUrl, priority, repository } = req.body;

    // Support both formats: new format (githubRepoId, githubUrl) and old format (repository object)
    let repoData;
    
    if (githubRepoId && githubUrl) {
      // New format: extract repo info from URL
      const urlParts = githubUrl.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repoName = urlParts[1];
      
      repoData = {
        id: parseInt(githubRepoId, 10),
        name: repoName,
        full_name: `${owner}/${repoName}`,
        html_url: githubUrl,
        clone_url: `https://github.com/${owner}/${repoName}.git`
      };
    } else if (repository) {
      // Old format: use repository object
      repoData = repository;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either (githubRepoId and githubUrl) or repository data is required'
      });
    }

    const requiredFields = ['id', 'name', 'full_name'];
    const missingFields = requiredFields.filter(field => !repoData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required repository fields: ${missingFields.join(', ')}`
      });
    }

    const project = await evaluationProjectService.addProject(userId, repoData, priority);

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