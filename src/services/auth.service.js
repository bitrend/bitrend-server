const axios = require('axios');

const handleGithubCallback = async (authorizationCode) => {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  // 1. Access token 요청
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

  const { access_token } = tokenResponse.data;

  if (!access_token) {
    throw new Error('Failed to get access token from GitHub');
  }

  // 2. 사용자 정보 가져오기
  const userResponse = await axios({
    method: 'get',
    url: 'https://api.github.com/user',
    headers: {
      Authorization: `Bearer ${access_token}`
    }
  });

  const githubUser = userResponse.data;

  // 3. 여기서 DB에 사용자 저장/업데이트 로직 추가
  // const user = await userRepository.findOrCreateByGithubId(githubUser.id, githubUser);

  return {
    accessToken: access_token,
    user: {
      id: githubUser.id,
      login: githubUser.login,
      name: githubUser.name,
      email: githubUser.email,
      avatarUrl: githubUser.avatar_url
    }
  };
};

module.exports = {
  handleGithubCallback
};
