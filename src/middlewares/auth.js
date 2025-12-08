const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');

const requireAuth = async (req, res, next) => {
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

  try {
    // 데이터베이스에서 최신 사용자 정보 가져오기 (access_token 포함)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({
        message: 'user not found'
      });
    }

    // 검증된 사용자 정보를 req에 저장
    req.user = user;

    next();
  } catch (error) {
    console.error('Error fetching user in auth middleware:', error);
    return res.status(500).json({
      message: 'authentication error'
    });
  }
};

module.exports = {
  requireAuth
};
