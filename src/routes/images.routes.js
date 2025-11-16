const express = require('express');
const imagesController = require('../controllers/images.controller');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// 인증 필요한 라우트
router.get('/', requireAuth, imagesController.getImages);

module.exports = router;
