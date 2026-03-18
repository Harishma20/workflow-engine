const { v4: uuidv4 } = require('uuid');
const Workflow = require('../models/Workflow');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Execution = require('../models/Execution');

// GET /api/workflows
exports.listWorkflows = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status === 'active') query.is_active = true;
    if (status === 'inactive') query.is_active = false;

    const totalCount = await Workflow.countDocuments(query);
    const workflows = await Workflow.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Append step counts
    const workflowsWithSteps = await Promise.all(
      workflows.map(async (wf) => {
        const stepCount = await Step.countDocuments({ workflow_id: wf._id });
        return { ...wf.toObject(), step_count: stepCount };
      })
    );

    res.json({ data: workflowsWithSteps, total: totalCount, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/workflows/:id
exports.getWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: workflow._id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(
      steps.map(async (step) => {
        const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
        return { ...step.toObject(), rules };
      })
    );

    res.json({ ...workflow.toObject(), steps: stepsWithRules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/workflows
exports.createWorkflow = async (req, res) => {
  try {
    const { name, description, input_schema, is_active } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const workflow = new Workflow({
      _id: uuidv4(),
      name,
      description: description || '',
      version: 1,
      is_active: is_active !== undefined ? is_active : true,
      input_schema: input_schema || {},
      start_step_id: null,
    });
    await workflow.save();
    res.status(201).json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/workflows/:id
exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const { name, description, input_schema, is_active, start_step_id } = req.body;
    if (name !== undefined) workflow.name = name;
    if (description !== undefined) workflow.description = description;
    if (input_schema !== undefined) workflow.input_schema = input_schema;
    if (is_active !== undefined) workflow.is_active = is_active;
    if (start_step_id !== undefined) workflow.start_step_id = start_step_id;
    workflow.version += 1;

    await workflow.save();
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/workflows/:id
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    // Cascade delete steps and rules
    const steps = await Step.find({ workflow_id: req.params.id });
    for (const step of steps) {
      await Rule.deleteMany({ step_id: step._id });
    }
    await Step.deleteMany({ workflow_id: req.params.id });
    await Execution.deleteMany({ workflow_id: req.params.id });
    await Workflow.findByIdAndDelete(req.params.id);

    res.json({ message: 'Workflow deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
