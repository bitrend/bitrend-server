const searchService = require("../services/search.service");

const searchUsers = async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    // 검색어 유효성 검증
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }

    if (q.length < 1) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 1 character" });
    }

    // limit 파라미터 처리 (기본값: 10, 최대값: 50)
    const searchLimit = Math.min(parseInt(limit) || 10, 50);

    const result = await searchService.searchUsers(q, searchLimit);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getUserByUsername = async (req, res, next) => {
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
};

module.exports = {
  searchUsers,
  getUserByUsername,
};
