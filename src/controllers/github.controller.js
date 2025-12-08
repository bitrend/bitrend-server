const githubService = require('../services/github.service');
const githubRepositoryRepository = require('../repositories/githubRepository.repository');

const getRepositories = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      page = 1,
      per_page = 30,
      sort = 'updated',
      direction = 'desc',
      type = 'all',
      language,
      search
    } = req.query;

    if (!user.accessToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub access token not found'
      });
    }

    const options = {
      page: parseInt(page),
      per_page: Math.min(parseInt(per_page), 100),
      sort,
      direction,
      type
    };

    let repositories = await githubService.getUserRepositories(user.username, user.accessToken, options);

    if (language) {
      repositories = repositories.filter(repo =>
        repo.language && repo.language.toLowerCase().includes(language.toLowerCase())
      );
    }

    if (search) {
      repositories = repositories.filter(repo =>
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
      );
    }

    for (const repo of repositories) {
      try {
        await githubRepositoryRepository.upsertFromGithub(repo);
      } catch (error) {
        console.warn(`Failed to upsert repository ${repo.full_name}:`, error.message);
      }
    }

    const total = repositories.length;
    const hasMore = repositories.length === options.per_page;

    res.json({
      success: true,
      data: {
        repositories,
        pagination: {
          page: options.page,
          per_page: options.per_page,
          total,
          hasMore
        }
      }
    });

  } catch (error) {
    console.error('Error fetching repositories:', error);

    if (error.code === 'UNAUTHORIZED') {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication expired. Please reconnect your account.',
        code: 'GITHUB_AUTH_EXPIRED'
      });
    }

    if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        success: false,
        message: 'GitHub API rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    next(error);
  }
};

const getRepositoryDetails = async (req, res, next) => {
  try {
    const user = req.user;
    const { owner, repo } = req.params;

    if (!user.accessToken) {
      return res.status(401).json({
        success: false,
        message: 'GitHub access token not found'
      });
    }

    const [details, languages, stats] = await Promise.allSettled([
      githubService.getRepositoryDetails(owner, repo, user.accessToken),
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken)
    ]);

    const response = {
      success: true,
      data: {
        details: details.status === 'fulfilled' ? details.value : null,
        languages: languages.status === 'fulfilled' ? languages.value : [],
        stats: stats.status === 'fulfilled' ? stats.value : null
      }
    };

    if (details.status === 'rejected') {
      response.warnings = response.warnings || [];
      response.warnings.push('Could not fetch repository details');
    }

    res.json(response);

  } catch (error) {
    console.error('Error fetching repository details:', error);

    if (error.code === 'UNAUTHORIZED') {
      return res.status(401).json({
        success: false,
        message: 'GitHub authentication expired. Please reconnect your account.',
        code: 'GITHUB_AUTH_EXPIRED'
      });
    }

    if (error.code === 'RATE_LIMIT') {
      return res.status(429).json({
        success: false,
        message: 'GitHub API rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    next(error);
  }
};

module.exports = {
  getRepositories,
  getRepositoryDetails
};