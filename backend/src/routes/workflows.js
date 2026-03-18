const express = require('express');
const router = express.Router();
const wfCtrl = require('../controllers/workflowController');
const stepCtrl = require('../controllers/stepController');
const execCtrl = require('../controllers/executionController');

// Workflow routes
router.get('/', wfCtrl.listWorkflows);
router.post('/', wfCtrl.createWorkflow);
router.get('/:id', wfCtrl.getWorkflow);
router.put('/:id', wfCtrl.updateWorkflow);
router.delete('/:id', wfCtrl.deleteWorkflow);

// Step routes (nested under workflow)
router.get('/:workflow_id/steps', stepCtrl.listSteps);
router.post('/:workflow_id/steps', stepCtrl.createStep);

// Execute workflow
router.post('/:workflow_id/execute', execCtrl.startExecution);

module.exports = router;
