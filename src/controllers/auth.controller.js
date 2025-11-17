const authService = require('../services/auth.service');

const githubCallback = async (req, res, next) => {
  try {
    const { authorizationCode } = req.body;
    
    console.log('Received authorization code:', authorizationCode);
    console.log('Request body:', req.body);
    
    if (!authorizationCode) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const result = await authService.handleGithubCallback(authorizationCode);
    res.json(result);
  } catch (error) {
    console.error('GitHub callback error:', error.message);
    next(error);
  }
};

module.exports = {
  githubCallback
};
