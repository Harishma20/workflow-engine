const express = require('express');
const router = express.Router();
const stepCtrl = require('../controllers/stepController');
const ruleCtrl = require('../controllers/ruleController');

// Step CRUD
router.put('/:id', stepCtrl.updateStep);
router.delete('/:id', stepCtrl.deleteStep);

// Rules nested under step
router.get('/:step_id/rules', ruleCtrl.listRules);
router.post('/:step_id/rules', ruleCtrl.createRule);

module.exports = router;
