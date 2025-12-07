const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';
const RATE_LIMIT_DELAY = 1000;

/**
 * GitHub API 요청 헬퍼
 */
const githubRequest = async (url, accessToken, retries = 3) => {
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      const err = new Error('GitHub 인증이 만료되었습니다.');
      err.code = 'UNAUTHORIZED';
      err.statusCode = 401;
      throw err;
    }

    if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      if (retries > 0) {
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
        const waitTime = Math.max(resetTime - Date.now(), RATE_LIMIT_DELAY);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return githubRequest(url, accessToken, retries - 1);
      }
      const err = new Error('GitHub API rate limit exceeded');
      err.code = 'RATE_LIMIT';
      err.statusCode = 429;
      throw err;
    }

    if (error.response?.status >= 500 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return githubRequest(url, accessToken, retries - 1);
    }

    throw error;
  }
};

/**
 * 사용자 통계 조회
 */
const getUserStats = async (username, accessToken) => {
  // 사용자의 repositories 조회
  const repos = await githubRequest(
    `${GITHUB_API_BASE}/users/${username}/repos?per_page=100`,
    accessToken
  );
  
  const totalProjects = repos.length;
  const completedProjects = repos.filter(repo => repo.archived).length;
  const inProgressProjects = totalProjects - completedProjects;
  
  // 기여도 계산 - GitHub API를 통해 사용자의 전체 기여도 추정
  let totalContributions = 0;
  
  // 각 레포지토리의 커밋 수를 합산
  for (const repo of repos.slice(0, 10)) { // 성능을 위해 최대 10개 레포만 확인
    try {
      const commits = await githubRequest(
        `${GITHUB_API_BASE}/repos/${repo.owner.login}/${repo.name}/commits?author=${username}&per_page=100`,
        accessToken
      );
      totalContributions += commits.length;
    } catch (error) {
      // 개별 repo 조회 실패는 무시 (권한 없는 private repo 등)
      continue;
    }
  }
  
  return {
    totalProjects,
    completedProjects,
    inProgressProjects,
    totalContributions
  };
};

/**
 * 사용자 활동 조회
 */
const getUserActivities = async (username, accessToken, limit, offset) => {
  // GitHub events 조회 (최대 300개까지 가져와서 pagination 적용)
  const perPage = Math.min(limit + offset, 100);
  const events = await githubRequest(
    `${GITHUB_API_BASE}/users/${username}/events?per_page=${perPage}`,
    accessToken
  );
  
  // offset 적용
  const paginatedEvents = events.slice(offset, offset + limit);
  
  // GitHub events를 활동 형식으로 변환
  const activities = paginatedEvents.map((event, index) => {
    const activity = transformGithubEvent(event, offset + index + 1);
    return activity;
  });
  
  return {
    activities,
    total: events.length,
    hasMore: events.length >= offset + limit
  };
};

/**
 * GitHub event를 활동 형식으로 변환
 */
const transformGithubEvent = (event, id) => {
  let type = 'update';
  let action = '';
  let projectName = event.repo?.name || null;
  
  switch (event.type) {
    case 'PushEvent':
      type = 'update';
      action = `Pushed to ${projectName}`;
      break;
    case 'CreateEvent':
      type = 'create';
      action = `Created ${event.payload.ref_type} in ${projectName}`;
      break;
    case 'PullRequestEvent':
      type = 'update';
      action = `${event.payload.action} pull request in ${projectName}`;
      break;
    case 'IssuesEvent':
      type = 'update';
      action = `${event.payload.action} issue in ${projectName}`;
      break;
    case 'WatchEvent':
      type = 'join';
      action = `Starred ${projectName}`;
      break;
    default:
      type = 'update';
      action = `${event.type} in ${projectName}`;
  }
  
  const timestamp = event.created_at;
  const relativeTime = getRelativeTime(new Date(timestamp));
  
  return {
    id,
    type,
    action,
    projectName,
    timestamp,
    relativeTime
  };
};

/**
 * 상대 시간 계산
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
};

/**
 * 사용자 리포지토리 목록 조회
 */
const getUserRepositories = async (username, accessToken, options = {}) => {
  const { sort = 'updated', direction = 'desc', per_page = 30, page = 1, type = 'all' } = options;

  const url = `${GITHUB_API_BASE}/user/repos?sort=${sort}&direction=${direction}&per_page=${per_page}&page=${page}&type=${type}`;

  try {
    const repositories = await githubRequest(url, accessToken);
    return repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      size: repo.size,
      private: repo.private,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      pushed_at: repo.pushed_at,
      default_branch: repo.default_branch
    }));
  } catch (error) {
    console.error('Error fetching user repositories:', error.message);
    throw error;
  }
};

/**
 * 특정 리포지토리 상세 정보 조회
 */
const getRepositoryDetails = async (owner, repo, accessToken) => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;

  try {
    const repository = await githubRequest(url, accessToken);
    return {
      id: repository.id,
      name: repository.name,
      full_name: repository.full_name,
      description: repository.description,
      language: repository.language,
      stargazers_count: repository.stargazers_count,
      forks_count: repository.forks_count,
      watchers_count: repository.watchers_count,
      size: repository.size,
      private: repository.private,
      html_url: repository.html_url,
      clone_url: repository.clone_url,
      created_at: repository.created_at,
      updated_at: repository.updated_at,
      pushed_at: repository.pushed_at,
      default_branch: repository.default_branch,
      topics: repository.topics || [],
      license: repository.license,
      has_issues: repository.has_issues,
      has_projects: repository.has_projects,
      has_wiki: repository.has_wiki,
      archived: repository.archived,
      disabled: repository.disabled
    };
  } catch (error) {
    console.error('Error fetching repository details:', error.message);
    throw error;
  }
};

/**
 * 리포지토리 언어 분석
 */
const getRepositoryLanguages = async (owner, repo, accessToken) => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`;

  try {
    const languages = await githubRequest(url, accessToken);

    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

    return Object.entries(languages).map(([language, bytes]) => ({
      language,
      bytes,
      percentage: total > 0 ? (bytes / total * 100).toFixed(2) : 0
    })).sort((a, b) => b.bytes - a.bytes);
  } catch (error) {
    console.error('Error fetching repository languages:', error.message);
    throw error;
  }
};

/**
 * 리포지토리 통계 정보 조회
 */
const getRepositoryStats = async (owner, repo, accessToken) => {
  try {
    const [repoDetails, languages, commits, contributors] = await Promise.allSettled([
      getRepositoryDetails(owner, repo, accessToken),
      getRepositoryLanguages(owner, repo, accessToken),
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=1`, accessToken),
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=100`, accessToken)
    ]);

    const stats = {
      basic: repoDetails.status === 'fulfilled' ? repoDetails.value : null,
      languages: languages.status === 'fulfilled' ? languages.value : [],
      totalCommits: 0,
      contributorsCount: 0,
      lastCommitDate: null
    };

    if (commits.status === 'fulfilled' && commits.value.length > 0) {
      try {
        const allCommits = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=100`, accessToken);
        stats.totalCommits = allCommits.length;
        stats.lastCommitDate = allCommits[0]?.commit?.committer?.date;
      } catch (error) {
        console.warn('Could not fetch all commits, using approximate count');
        stats.totalCommits = -1;
      }
    }

    if (contributors.status === 'fulfilled') {
      stats.contributorsCount = contributors.value.length;
    }

    return stats;
  } catch (error) {
    console.error('Error fetching repository stats:', error.message);
    throw error;
  }
};

/**
 * 리포지토리 파일 내용 조회 (분석용)
 */
const getRepositoryFiles = async (owner, repo, accessToken, maxFiles = 10) => {
  try {
    const tree = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${await getDefaultBranch(owner, repo, accessToken)}?recursive=1`, accessToken);

    const codeFiles = tree.tree
      .filter(item => item.type === 'blob')
      .filter(item => {
        const ext = item.path.split('.').pop().toLowerCase();
        return ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb'].includes(ext);
      })
      .slice(0, maxFiles);

    const fileContents = await Promise.allSettled(
      codeFiles.map(async file => {
        try {
          const content = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}`, accessToken);
          return {
            name: file.path,
            content: Buffer.from(content.content, 'base64').toString('utf-8'),
            size: file.size || 0
          };
        } catch (error) {
          return null;
        }
      })
    );

    return fileContents
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);

  } catch (error) {
    console.error('Error fetching repository files:', error.message);
    return [];
  }
};

/**
 * 리포지토리 구조 조회
 */
const getRepositoryStructure = async (owner, repo, accessToken) => {
  try {
    const tree = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${await getDefaultBranch(owner, repo, accessToken)}?recursive=1`, accessToken);

    return tree.tree
      .filter(item => item.type === 'tree' || item.path.includes('/'))
      .map(item => item.path)
      .slice(0, 100);

  } catch (error) {
    console.error('Error fetching repository structure:', error.message);
    return [];
  }
};

/**
 * package.json 파일 조회
 */
const getPackageJson = async (owner, repo, accessToken) => {
  try {
    const content = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/package.json`, accessToken);
    const packageJson = JSON.parse(Buffer.from(content.content, 'base64').toString('utf-8'));
    return packageJson;
  } catch (error) {
    console.warn('package.json not found or not accessible');
    return null;
  }
};

/**
 * 기본 브랜치 조회
 */
const getDefaultBranch = async (owner, repo, accessToken) => {
  try {
    const repoDetails = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, accessToken);
    return repoDetails.default_branch || 'main';
  } catch (error) {
    return 'main';
  }
};

/**
 * 리포지토리 브랜치 정보 조회
 */
const getRepositoryBranches = async (owner, repo, accessToken) => {
  try {
    const branches = await githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`, accessToken);
    return branches.map(branch => ({
      name: branch.name,
      protected: branch.protected || false,
      commit: {
        sha: branch.commit.sha,
        date: branch.commit.commit.committer.date
      }
    }));
  } catch (error) {
    console.error('Error fetching repository branches:', error.message);
    return [];
  }
};

/**
 * 리포지토리 이슈 분석
 */
const getRepositoryIssues = async (owner, repo, accessToken) => {
  try {
    const [openIssues, closedIssues] = await Promise.allSettled([
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=100`, accessToken),
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=closed&per_page=100`, accessToken)
    ]);

    return {
      openCount: openIssues.status === 'fulfilled' ? openIssues.value.length : 0,
      closedCount: closedIssues.status === 'fulfilled' ? closedIssues.value.length : 0,
      totalCount: (openIssues.status === 'fulfilled' ? openIssues.value.length : 0) +
                  (closedIssues.status === 'fulfilled' ? closedIssues.value.length : 0)
    };
  } catch (error) {
    console.error('Error fetching repository issues:', error.message);
    return { openCount: 0, closedCount: 0, totalCount: 0 };
  }
};

/**
 * 리포지토리 Pull Request 분석
 */
const getRepositoryPullRequests = async (owner, repo, accessToken) => {
  try {
    const [openPRs, closedPRs] = await Promise.allSettled([
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=100`, accessToken),
      githubRequest(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=closed&per_page=100`, accessToken)
    ]);

    return {
      openCount: openPRs.status === 'fulfilled' ? openPRs.value.length : 0,
      closedCount: closedPRs.status === 'fulfilled' ? closedPRs.value.length : 0,
      totalCount: (openPRs.status === 'fulfilled' ? openPRs.value.length : 0) +
                  (closedPRs.status === 'fulfilled' ? closedPRs.value.length : 0)
    };
  } catch (error) {
    console.error('Error fetching repository pull requests:', error.message);
    return { openCount: 0, closedCount: 0, totalCount: 0 };
  }
};

module.exports = {
  githubRequest,
  getUserStats,
  getUserActivities,
  getUserRepositories,
  getRepositoryDetails,
  getRepositoryLanguages,
  getRepositoryStats,
  getRepositoryFiles,
  getRepositoryStructure,
  getPackageJson,
  getDefaultBranch,
  getRepositoryBranches,
  getRepositoryIssues,
  getRepositoryPullRequests
};
