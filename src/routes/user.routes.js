const express = require('express');
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// 기존 API (인증 불필요)
router.get('/', userController.getUsers);
router.post('/', userController.createUser);

// 새로운 프로필 API 엔드포인트 (인증 필요) - 구체적인 경로를 먼저 정의
router.get('/:userId/stats', requireAuth, userController.getStats);
router.get('/:userId/activities', requireAuth, userController.getActivities);
router.patch('/:userId', requireAuth, userController.updateProfile);
router.get('/:userId', requireAuth, userController.getProfile);

// 기존 API - 가장 마지막에 배치 (deprecated, 새 API 사용 권장)
router.get('/:id', userController.getUserById);

module.exports = router;
