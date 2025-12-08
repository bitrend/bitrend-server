const userRepository = require("../repositories/user.repository");
const githubService = require("./github.service");
const CacheService = require("./cache.service");

const cacheService = new CacheService();

const getAllUsers = async () => {
  const users = await userRepository.findAll();
  return users.map(user => ({
    ...user,
    githubId: user.githubId.toString()
  }));
};

const getUserById = async (id) => {
  return await userRepository.findById(id);
};

const getUserByUsername = async (username) => {
  const user = await userRepository.findByUsername(username);

  if (!user) {
    return null;
  }

  // Convert BigInt to string for JSON serialization and format response
  return {
    id: user.id,
    githubId: user.githubId.toString(),
    username: user.username,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    joinDate: user.createdAt.toISOString().split("T")[0],
    followerCount: user.followerCount,
  };
};

const createUser = async (userData) => {
  // 비즈니스 로직 (예: 유효성 검증, 데이터 변환 등)
  return await userRepository.create(userData);
};

const getUserProfile = async (userId) => {
  const cacheKey = cacheService.getUserKey(userId);

  return await cacheService.cacheWithFallback(
    cacheKey,
    async () => {
      const user = await userRepository.findById(userId);

      if (!user) {
        const error = new Error("사용자를 찾을 수 없습니다.");
        error.code = "USER_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      return {
        id: user.id,
        githubId: user.githubId.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        joinDate: user.createdAt.toISOString().split("T")[0],
        followerCount: user.followerCount,
      };
    },
    60 * 10 // 10분 캐시
  );
};

const getUserStats = async (userId) => {
  const cacheKey = cacheService.getUserStatsKey(userId);

  return await cacheService.cacheWithFallback(
    cacheKey,
    async () => {
      const user = await userRepository.findById(userId);

      if (!user) {
        const error = new Error("사용자를 찾을 수 없습니다.");
        error.code = "USER_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      // GitHub API를 통해 통계 조회
      const stats = await githubService.getUserStats(
        user.username,
        user.accessToken
      );

      return stats;
    },
    60 * 5 // 5분 캐시 (GitHub 데이터는 자주 변경)
  );
};

const getUserActivities = async (userId, limit, offset) => {
  const cacheKey = `user:${userId}:activities:${limit}:${offset}`;

  return await cacheService.cacheWithFallback(
    cacheKey,
    async () => {
      const user = await userRepository.findById(userId);

      if (!user) {
        const error = new Error("사용자를 찾을 수 없습니다.");
        error.code = "USER_NOT_FOUND";
        error.statusCode = 404;
        throw error;
      }

      // GitHub API를 통해 활동 조회
      const activities = await githubService.getUserActivities(
        user.username,
        user.accessToken,
        limit,
        offset
      );

      return activities;
    },
    60 * 3 // 3분 캐시 (활동 데이터는 더 자주 변경)
  );
};

const updateUserProfile = async (userId, requesterId, updateData) => {
  // 권한 확인: 본인만 수정 가능
  if (userId !== requesterId) {
    const error = new Error("권한이 없습니다.");
    error.code = "FORBIDDEN";
    error.statusCode = 403;
    throw error;
  }

  // 허용된 필드만 추출
  const allowedFields = ["name", "email", "role"];
  const filteredData = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }

  // 업데이트할 데이터가 없는 경우
  if (Object.keys(filteredData).length === 0) {
    const error = new Error("업데이트할 데이터가 없습니다.");
    error.code = "VALIDATION_ERROR";
    error.statusCode = 400;
    throw error;
  }

  const updatedUser = await userRepository.update(userId, filteredData);

  // 프로필 업데이트 후 관련 캐시 무효화
  await cacheService.invalidateUserCache(userId);

  return {
    id: updatedUser.id,
    githubId: updatedUser.githubId.toString(),
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
    avatarUrl: updatedUser.avatarUrl,
    role: updatedUser.role || "Developer",
    joinDate: updatedUser.createdAt.toISOString().split("T")[0],
  };
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  getUserProfile,
  getUserStats,
  getUserActivities,
  updateUserProfile,
};
