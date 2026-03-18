const { v4: uuidv4 } = require('uuid');
const Execution = require('../models/Execution');
const Workflow = require('../models/Workflow');
const { runExecution, approveStep } = require('../services/executionService');

// POST /api/workflows/:workflow_id/execute
exports.startExecution = async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const workflow = await Workflow.findById(workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!workflow.is_active) return res.status(400).json({ error: 'Workflow is not active' });
    if (!workflow.start_step_id) return res.status(400).json({ error: 'Workflow has no start step defined' });

    const { data = {}, triggered_by = 'anonymous' } = req.body;

    const execution = new Execution({
      _id: uuidv4(),
      workflow_id: workflow._id,
      workflow_version: workflow.version,
      status: 'pending',
      data,
      logs: [],
      current_step_id: workflow.start_step_id,
      retries: 0,
      triggered_by,
      started_at: new Date(),
      ended_at: null,
    });
    await execution.save();

    // Run execution asynchronously but await it to return full result
    const result = await runExecution(execution._id);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/executions/:id
exports.getExecution = async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/executions (audit log)
exports.listExecutions = async (req, res) => {
  try {
    const { page = 1, limit = 20, workflow_id, status } = req.query;
    const query = {};
    if (workflow_id) query.workflow_id = workflow_id;
    if (status) query.status = status;

    const total = await Execution.countDocuments(query);
    const executions = await Execution.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Enrich with workflow name
    const enriched = await Promise.all(executions.map(async (ex) => {
      const wf = await Workflow.findById(ex.workflow_id).select('name');
      return { ...ex.toObject(), workflow_name: wf ? wf.name : 'Unknown' };
    }));

    res.json({ data: enriched, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/executions/:id/cancel
exports.cancelExecution = async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (['completed', 'failed', 'canceled'].includes(execution.status)) {
      return res.status(400).json({ error: `Execution already ${execution.status}` });
    }
    execution.status = 'canceled';
    execution.ended_at = new Date();
    await execution.save();
    res.json(execution);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/executions/:id/retry
exports.retryExecution = async (req, res) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed executions can be retried' });
    }

    // Reset last failed step and re-run from current_step_id
    const lastLog = execution.logs[execution.logs.length - 1];
    if (lastLog && lastLog.status === 'failed') {
      execution.logs[execution.logs.length - 1].status = 'skipped';
    }

    execution.status = 'in_progress';
    execution.ended_at = null;
    execution.retries += 1;
    await execution.save();

    const result = await runExecution(execution._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/executions/:id/approve
exports.approveExecution = async (req, res) => {
  try {
    const { approved = true, approver_id = 'user' } = req.body;
    const result = await approveStep(req.params.id, approver_id, approved);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
