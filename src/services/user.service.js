const userRepository = require('../repositories/user.repository');
const githubService = require('./github.service');

const getAllUsers = async () => {
  return await userRepository.findAll();
};

const getUserById = async (id) => {
  return await userRepository.findById(id);
};

const createUser = async (userData) => {
  // 비즈니스 로직 (예: 유효성 검증, 데이터 변환 등)
  return await userRepository.create(userData);
};

const getUserProfile = async (userId) => {
  const user = await userRepository.findById(userId);
  
  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.code = 'USER_NOT_FOUND';
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
    role: user.role || 'Developer',
    joinDate: user.createdAt.toISOString().split('T')[0]
  };
};

const getUserStats = async (userId) => {
  const user = await userRepository.findById(userId);
  
  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.code = 'USER_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }
  
  // GitHub API를 통해 통계 조회
  const stats = await githubService.getUserStats(user.username, user.accessToken);
  
  return stats;
};

const getUserActivities = async (userId, limit, offset) => {
  const user = await userRepository.findById(userId);
  
  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.code = 'USER_NOT_FOUND';
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
};

const updateUserProfile = async (userId, requesterId, updateData) => {
  // 권한 확인: 본인만 수정 가능
  if (userId !== requesterId) {
    const error = new Error('권한이 없습니다.');
    error.code = 'FORBIDDEN';
    error.statusCode = 403;
    throw error;
  }
  
  // 허용된 필드만 추출
  const allowedFields = ['name', 'email', 'role'];
  const filteredData = {};
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  }
  
  // 업데이트할 데이터가 없는 경우
  if (Object.keys(filteredData).length === 0) {
    const error = new Error('업데이트할 데이터가 없습니다.');
    error.code = 'VALIDATION_ERROR';
    error.statusCode = 400;
    throw error;
  }
  
  const updatedUser = await userRepository.update(userId, filteredData);
  
  return {
    id: updatedUser.id,
    githubId: updatedUser.githubId.toString(),
    username: updatedUser.username,
    name: updatedUser.name,
    email: updatedUser.email,
    avatarUrl: updatedUser.avatarUrl,
    role: updatedUser.role || 'Developer',
    joinDate: updatedUser.createdAt.toISOString().split('T')[0]
  };
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  getUserProfile,
  getUserStats,
  getUserActivities,
  updateUserProfile
};
