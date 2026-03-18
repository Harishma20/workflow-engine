const { v4: uuidv4 } = require('uuid');
const Rule = require('../models/Rule');
const Step = require('../models/Step');

// GET /api/steps/:step_id/rules
exports.listRules = async (req, res) => {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id }).sort({ priority: 1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/steps/:step_id/rules
exports.createRule = async (req, res) => {
  try {
    const { step_id } = req.params;
    const step = await Step.findById(step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { condition, next_step_id, priority } = req.body;
    if (!condition) return res.status(400).json({ error: 'condition is required' });

    const existingRules = await Rule.countDocuments({ step_id });
    const rule = new Rule({
      _id: uuidv4(),
      step_id,
      condition,
      next_step_id: next_step_id || null,
      priority: priority !== undefined ? priority : existingRules + 1,
    });

    await rule.save();
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/rules/:id
exports.updateRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const { condition, next_step_id, priority } = req.body;
    if (condition !== undefined) rule.condition = condition;
    if (next_step_id !== undefined) rule.next_step_id = next_step_id;
    if (priority !== undefined) rule.priority = priority;

    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/rules/:id
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
