const userRepository = require('../repositories/user.repository');

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

module.exports = {
  getAllUsers,
  getUserById,
  createUser
};
