const express = require('express');
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);

// 새로운 프로필 API 엔드포인트 (인증 필요)
router.get('/:userId', requireAuth, userController.getProfile);
router.get('/:userId/stats', requireAuth, userController.getStats);
router.get('/:userId/activities', requireAuth, userController.getActivities);
router.patch('/:userId', requireAuth, userController.updateProfile);

module.exports = router;
