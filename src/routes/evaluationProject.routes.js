const express = require('express');
const router = express.Router();
const evaluationProjectController = require('../controllers/evaluationProject.controller');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.get('/projects', evaluationProjectController.getProjects);

router.post('/projects', evaluationProjectController.addProject);

router.put('/projects/reorder', evaluationProjectController.reorderProjects);

router.get('/projects/:id', evaluationProjectController.getProjectById);

router.delete('/projects/:id', evaluationProjectController.removeProject);

module.exports = router;