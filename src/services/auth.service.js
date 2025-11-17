const axios = require('axios');
const userRepository = require('../repositories/user.repository');
const { generateToken } = require('../utils/jwt');

const handleGithubCallback = async (authorizationCode) => {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

  if (!clientID || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  console.log('Requesting token with:', {
    client_id: clientID,
    code: authorizationCode
  });

  // 1. GitHub Access token 요청
  const tokenResponse = await axios({
    method: 'post',
    url: 'https://github.com/login/oauth/access_token',
    headers: {
      accept: 'application/json'
    },
    data: {
      client_id: clientID,
      client_secret: clientSecret,
      code: authorizationCode
    }
  });

  const { access_token, error, error_description } = tokenResponse.data;

  if (!access_token) {
    console.error('GitHub token response:', tokenResponse.data);
    throw new Error(`Failed to get access token from GitHub: ${error_description || error || 'Unknown error'}`);
  }

  // 2. GitHub 사용자 정보 가져오기
  const userResponse = await axios({
    method: 'get',
    url: 'https://api.github.com/user',
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });

  const githubUser = userResponse.data;

  // 3. DB에서 사용자 찾기 또는 생성
  let user = await userRepository.findByGithubId(githubUser.id);

  if (user) {
    // 기존 사용자 - 정보 업데이트
    user = await userRepository.updateFromGithub(user.id, githubUser);
  } else {
    // 신규 사용자 - 회원가입
    user = await userRepository.createFromGithub(githubUser);
  }

  // 4. 우리 서버의 JWT 토큰 발급
  const token = generateToken({
    id: user.id,
    githubId: user.githubId.toString(),
    username: user.username
  });

  return {
    token,
    user: {
      id: user.id,
      githubId: user.githubId.toString(),
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    }
  };
};

module.exports = {
  handleGithubCallback
};
