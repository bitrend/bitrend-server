const authService = require('../services/auth.service');

const githubCallback = async (req, res, next) => {
  try {
    const { authorizationCode } = req.body;
    
    if (!authorizationCode) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const result = await authService.handleGithubCallback(authorizationCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  githubCallback
};
