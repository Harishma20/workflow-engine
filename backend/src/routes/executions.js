const express = require('express');
const router = express.Router();
const execCtrl = require('../controllers/executionController');

router.get('/', execCtrl.listExecutions);
router.get('/:id', execCtrl.getExecution);
router.post('/:id/cancel', execCtrl.cancelExecution);
router.post('/:id/retry', execCtrl.retryExecution);
router.post('/:id/approve', execCtrl.approveExecution);

module.exports = router;
