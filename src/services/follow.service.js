const followRepository = require("../repositories/follow.repository");
const userRepository = require("../repositories/user.repository");

const followUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }

  const followingUser = await userRepository.findById(followingId);
  if (!followingUser) {
    throw new Error("User to follow not found");
  }

  const alreadyFollowing = await followRepository.isFollowing(
    followerId,
    followingId
  );
  if (alreadyFollowing) {
    throw new Error("Already following this user");
  }

  const follow = await followRepository.follow(followerId, followingId);

  // 팔로워/팔로잉 카운트 업데이트
  await userRepository.update(followerId, {
    followingCount: { increment: 1 },
  });
  await userRepository.update(followingId, {
    followerCount: { increment: 1 },
  });

  return follow;
};

const unfollowUser = async (followerId, followingId) => {
  const isFollowing = await followRepository.isFollowing(
    followerId,
    followingId
  );
  if (!isFollowing) {
    throw new Error("Not following this user");
  }

  await followRepository.unfollow(followerId, followingId);

  // 팔로워/팔로잉 카운트 업데이트
  await userRepository.update(followerId, {
    followingCount: { decrement: 1 },
  });
  await userRepository.update(followingId, {
    followerCount: { decrement: 1 },
  });

  return { message: "Unfollowed successfully" };
};

const checkFollowStatus = async (followerId, followingId) => {
  const isFollowing = await followRepository.isFollowing(
    followerId,
    followingId
  );
  return { isFollowing };
};

const getFollowers = async (userId, limit = 20, offset = 0) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const follows = await followRepository.getFollowers(userId, limit, offset);
  const total = await followRepository.getFollowersCount(userId);

  return {
    followers: follows.map((f) => f.follower),
    total,
    limit,
    offset,
  };
};

const getFollowing = async (userId, limit = 20, offset = 0) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const follows = await followRepository.getFollowing(userId, limit, offset);
  const total = await followRepository.getFollowingCount(userId);

  return {
    following: follows.map((f) => f.following),
    total,
    limit,
    offset,
  };
};

module.exports = {
  followUser,
  unfollowUser,
  checkFollowStatus,
  getFollowers,
  getFollowing,
};
