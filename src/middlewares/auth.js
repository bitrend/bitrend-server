const requireAuth = (req, res, next) => {
  const accessToken = req.headers.authorization;

  if (!accessToken) {
    return res.status(403).json({
      message: 'no permission to access resources'
    });
  }

  // Bearer 토큰 형식인 경우 처리
  const token = accessToken.startsWith('Bearer ') 
    ? accessToken.slice(7) 
    : accessToken;

  // 토큰을 req에 저장하여 다음 미들웨어/컨트롤러에서 사용 가능하게
  req.accessToken = token;
  
  next();
};

module.exports = {
  requireAuth
};
