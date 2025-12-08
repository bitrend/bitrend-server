const authService = require('../services/auth.service');

/**
 * GitHub OAuth 로그인 URL 반환
 */
const getGithubAuthUrl = async (req, res, next) => {
  try {
    const authUrl = authService.getGithubAuthUrl();
    res.json({ 
      success: true,
      authUrl,
      message: 'GitHub 인증 URL을 생성했습니다. 이 URL로 이동하여 권한을 승인해주세요.'
    });
  } catch (error) {
    console.error('Get GitHub auth URL error:', error.message);
    next(error);
  }
};

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
  getGithubAuthUrl,
  githubCallback
};
