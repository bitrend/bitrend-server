const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route   GET /api/auth/github/url
 * @desc    GitHub OAuth 인증 URL 생성 (필요한 scope 포함)
 * @access  Public
 */
router.get('/github/url', authController.getGithubAuthUrl);

/**
 * @route   POST /api/auth/github/callback
 * @desc    GitHub OAuth 콜백 처리
 * @access  Public
 */
router.post('/github/callback', authController.githubCallback);

module.exports = router;
