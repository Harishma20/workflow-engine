const { v4: uuidv4 } = require('uuid');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');

// GET /api/workflows/:workflow_id/steps
exports.listSteps = async (req, res) => {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });
    res.json(steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/workflows/:workflow_id/steps
exports.createStep = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const workflow = await Workflow.findById(workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, step_type, order, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!step_type) return res.status(400).json({ error: 'step_type is required' });

    const existingSteps = await Step.countDocuments({ workflow_id });
    const step = new Step({
      _id: uuidv4(),
      workflow_id,
      name,
      step_type,
      order: order !== undefined ? order : existingSteps + 1,
      metadata: metadata || {},
    });
    await step.save();

    // If this is the first step, set as start_step_id
    if (!workflow.start_step_id) {
      workflow.start_step_id = step._id;
      await workflow.save();
    }

    res.status(201).json(step);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/steps/:id
exports.updateStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const { name, step_type, order, metadata } = req.body;
    if (name !== undefined) step.name = name;
    if (step_type !== undefined) step.step_type = step_type;
    if (order !== undefined) step.order = order;
    if (metadata !== undefined) step.metadata = metadata;

    await step.save();
    res.json(step);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/steps/:id
exports.deleteStep = async (req, res) => {
  try {
    const step = await Step.findById(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    // Remove rules for this step
    await Rule.deleteMany({ step_id: step._id });

    // If this step was the start_step_id, clear it
    const workflow = await Workflow.findById(step.workflow_id);
    if (workflow && workflow.start_step_id === step._id) {
      // Find next step
      const nextStep = await Step.findOne({ workflow_id: step.workflow_id, order: { $gt: step.order } }).sort({ order: 1 });
      workflow.start_step_id = nextStep ? nextStep._id : null;
      await workflow.save();
    }

    await Step.findByIdAndDelete(req.params.id);
    res.json({ message: 'Step deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
