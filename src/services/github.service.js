const axios = require('axios');

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub API 요청 헬퍼
 */
const githubRequest = async (url, accessToken) => {
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

module.exports = {
  githubRequest,
  getUserStats,
  getUserActivities
};
