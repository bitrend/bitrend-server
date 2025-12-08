const express = require('express');
const MonitoringController = require('../controllers/monitoring.controller');

const router = express.Router();
const monitoringController = new MonitoringController();

// Basic health check (public)
router.get('/health', monitoringController.getHealth);

// Liveness probe (public)
router.get('/liveness', monitoringController.getLiveness);

// Readiness probe (public)
router.get('/readiness', monitoringController.getReadiness);

// Detailed health with metrics (public but could be protected in production)
router.get('/health/detailed', monitoringController.getDetailedHealth);

// Performance metrics (public but could be protected in production)
router.get('/metrics', monitoringController.getMetrics);

module.exports = router;