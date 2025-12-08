const express = require("express");
const searchService = require("../services/search.service");

const router = express.Router();

// 사용자 검색
router.get("/users", async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    // 검색어 유효성 검사
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    if (q.length < 1) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 1 character" });
    }

    // limit 유효성 검사
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);

    const result = await searchService.searchUsers(q, parsedLimit);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// 특정 사용자 조회
router.get("/users/:username", async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await searchService.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
