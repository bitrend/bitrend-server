const express = require("express");
const followController = require("../controllers/follow.controller");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

// 모든 팔로우 API는 인증 필요
router.post("/:userId/follow", requireAuth, followController.followUser);
router.delete("/:userId/follow", requireAuth, followController.unfollowUser);
router.get(
  "/:userId/follow/status",
  requireAuth,
  followController.checkFollowStatus
);
router.get("/:userId/followers", requireAuth, followController.getFollowers);
router.get("/:userId/following", requireAuth, followController.getFollowing);

module.exports = router;
