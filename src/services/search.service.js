const searchRepository = require("../repositories/search.repository");

const searchUsers = async (query, limit) => {
  // 사용자 검색 실행
  const users = await searchRepository.searchUsers(query, limit);

  // 추천 검색어 생성
  const suggestions = await generateSuggestions(query, limit);

  // 전체 검색 결과 수 계산
  const total = await searchRepository.countSearchResults(query);

  return {
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      followerCount: user.followerCount,
    })),
    suggestions,
    total,
  };
};

const getUserByUsername = async (username) => {
  const user = await searchRepository.findByUsername(username);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    githubId: user.githubId.toString(),
    username: user.username,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio || null,
    followerCount: 0,
    followingCount: 0,
    repositoryCount: 0,
    createdAt: user.createdAt.toISOString(),
  };
};

const generateSuggestions = async (query, maxSuggestions = 5) => {
  // 유사한 username과 name을 기반으로 추천어 생성
  const suggestions = await searchRepository.getSuggestions(
    query,
    maxSuggestions
  );

  return suggestions.map((suggestion) => suggestion.value);
};

module.exports = {
  searchUsers,
  getUserByUsername,
};
