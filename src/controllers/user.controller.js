const userService = require('../services/user.service');

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const profile = await userService.getUserProfile(userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = await userService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

const getActivities = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const activities = await userService.getUserActivities(userId, limit, offset);
    res.json(activities);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const requesterId = req.user.id; // JWT에서 추출된 사용자 ID
    const updateData = req.body;
    
    const updatedProfile = await userService.updateUserProfile(
      userId, 
      requesterId, 
      updateData
    );
    res.json(updatedProfile);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  getProfile,
  getStats,
  getActivities,
  updateProfile
};
