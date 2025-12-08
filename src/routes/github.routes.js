const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github.controller');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.get('/repositories', githubController.getRepositories);

router.get('/repositories/:owner/:repo', githubController.getRepositoryDetails);

module.exports = router;