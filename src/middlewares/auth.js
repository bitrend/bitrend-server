const { verifyToken } = require('../utils/jwt');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({
      message: 'no permission to access resources'
    });
  }

  // Bearer 토큰 형식인 경우 처리
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;

  // JWT 토큰 검증
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      message: 'invalid or expired token'
    });
  }

  // 검증된 사용자 정보를 req에 저장
  req.user = decoded;
  
  next();
};

module.exports = {
  requireAuth
};
