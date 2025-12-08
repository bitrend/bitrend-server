const followService = require("../services/follow.service");

const followUser = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const result = await followService.followUser(followerId, followingId);
    res.status(201).json(result);
  } catch (error) {
    if (
      error.message === "Cannot follow yourself" ||
      error.message === "Already following this user" ||
      error.message === "User to follow not found"
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const unfollowUser = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const result = await followService.unfollowUser(followerId, followingId);
    res.json(result);
  } catch (error) {
    if (error.message === "Not following this user") {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const checkFollowStatus = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const result = await followService.checkFollowStatus(
      followerId,
      followingId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getFollowers = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await followService.getFollowers(userId, limit, offset);
    res.json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await followService.getFollowing(userId, limit, offset);
    res.json(result);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

module.exports = {
  followUser,
  unfollowUser,
  checkFollowStatus,
  getFollowers,
  getFollowing,
};
