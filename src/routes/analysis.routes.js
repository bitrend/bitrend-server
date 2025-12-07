const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.post('/evaluation', analysisController.startEvaluationAnalysis);

router.get('/evaluation/:id/status', analysisController.getAnalysisStatus);

router.get('/evaluation/:id/results', analysisController.getAnalysisResults);

module.exports = router;