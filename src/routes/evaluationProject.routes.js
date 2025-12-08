const express = require('express');
const router = express.Router();
const evaluationProjectController = require('../controllers/evaluationProject.controller');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.get('/projects', evaluationProjectController.getProjects);

router.post('/projects', evaluationProjectController.addProject);

router.put('/projects/reorder', evaluationProjectController.reorderProjects);

router.get('/evaluations', evaluationProjectController.getProjects);

router.post('/evaluations', evaluationProjectController.addProject);

router.get('/projects/:id', evaluationProjectController.getProjectById);

router.delete('/projects/:id', evaluationProjectController.removeProject);

router.delete('/evaluations/:id', evaluationProjectController.removeProject);

router.delete('/:id', evaluationProjectController.removeProject);

module.exports = router;