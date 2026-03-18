const express = require('express');
const router = express.Router();
const ruleCtrl = require('../controllers/ruleController');

router.put('/:id', ruleCtrl.updateRule);
router.delete('/:id', ruleCtrl.deleteRule);

module.exports = router;
