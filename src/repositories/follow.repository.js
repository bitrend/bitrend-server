const prisma = require("../config/prisma");

const follow = async (followerId, followingId) => {
  return await prisma.follow.create({
    data: {
      followerId,
      followingId,
    },
  });
};

const unfollow = async (followerId, followingId) => {
  return await prisma.follow.delete({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });
};

const isFollowing = async (followerId, followingId) => {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });
  return !!follow;
};

const getFollowers = async (userId, limit = 20, offset = 0) => {
  return await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          followerCount: true,
          followingCount: true,
          repositoryCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

const getFollowing = async (userId, limit = 20, offset = 0) => {
  return await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true,
          followerCount: true,
          followingCount: true,
          repositoryCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
};

const getFollowersCount = async (userId) => {
  return await prisma.follow.count({
    where: { followingId: userId },
  });
};

const getFollowingCount = async (userId) => {
  return await prisma.follow.count({
    where: { followerId: userId },
  });
};

module.exports = {
  follow,
  unfollow,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowersCount,
  getFollowingCount,
};
