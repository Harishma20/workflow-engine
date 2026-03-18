/**
 * Workflow Execution Service
 * Handles the step-by-step execution of a workflow, including:
 * - Rule evaluation
 * - Loop detection (max iterations)
 * - Step logging
 * - Notification/Task/Approval handling
 */

const Execution = require('../models/Execution');
const Step = require('../models/Step');
const Rule = require('../models/Rule');
const Workflow = require('../models/Workflow');
const { evaluateRules } = require('./ruleEngine');

const MAX_LOOP_ITERATIONS = 10; // Configurable: prevents infinite loops

// Simulate notification/task side effects
async function performStepAction(step) {
  if (step.step_type === 'notification') {
    // In a real system, send email/slack here
    console.log(`[NOTIFICATION] Sending via ${step.metadata?.channel || 'email'} to ${step.metadata?.assignee_email || 'N/A'}`);
  } else if (step.step_type === 'task') {
    console.log(`[TASK] Executing task: ${step.name}`);
  } else if (step.step_type === 'approval') {
    // Approval steps require external input; they stay in_progress until approved
    console.log(`[APPROVAL] Awaiting approval from ${step.metadata?.assignee_email || 'N/A'}`);
  }
}

/**
 * Run execution from current_step_id until completion, failure, or awaiting approval
 */
async function runExecution(executionId) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error(`Execution ${executionId} not found`);
  if (['completed', 'failed', 'canceled'].includes(execution.status)) {
    throw new Error(`Execution already ${execution.status}`);
  }

  execution.status = 'in_progress';
  execution.started_at = execution.started_at || new Date();
  await execution.save();

  // Track visited steps for loop detection
  const visitCount = {};
  let currentStepId = execution.current_step_id;

  while (currentStepId) {
    // Loop detection
    visitCount[currentStepId] = (visitCount[currentStepId] || 0) + 1;
    const iteration = visitCount[currentStepId];

    if (iteration > MAX_LOOP_ITERATIONS) {
      const errMsg = `Infinite loop detected on step ${currentStepId} after ${MAX_LOOP_ITERATIONS} iterations`;
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_id: currentStepId,
        step_name: 'Loop Detection',
        step_type: 'task',
        evaluated_rules: [],
        selected_next_step: null,
        status: 'failed',
        error_message: errMsg,
        started_at: new Date(),
        ended_at: new Date(),
        iteration,
      });
      await execution.save();
      return execution;
    }

    const step = await Step.findById(currentStepId);
    if (!step) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.logs.push({
        step_id: currentStepId,
        step_name: 'Unknown Step',
        step_type: 'task',
        evaluated_rules: [],
        status: 'failed',
        error_message: `Step ${currentStepId} not found`,
        started_at: new Date(),
        ended_at: new Date(),
        iteration,
      });
      await execution.save();
      return execution;
    }

    const stepStartedAt = new Date();
    const stepLog = {
      step_id: step._id,
      step_name: step.name,
      step_type: step.step_type,
      evaluated_rules: [],
      selected_next_step: null,
      status: 'in_progress',
      approver_id: null,
      error_message: null,
      started_at: stepStartedAt,
      ended_at: null,
      iteration,
    };

    // Perform step action
    await performStepAction(step);

    // For approval steps: pause execution and wait for manual approval
    if (step.step_type === 'approval') {
      stepLog.status = 'in_progress';
      execution.current_step_id = currentStepId;
      execution.status = 'in_progress';
      execution.logs.push(stepLog);
      await execution.save();
      return execution; // Resume will be triggered by approve action
    }

    // Evaluate rules to find next step
    const rules = await Rule.find({ step_id: currentStepId }).sort({ priority: 1 });
    const { matchedRule, evaluatedRules, error: ruleError } = evaluateRules(rules, execution.data);

    stepLog.evaluated_rules = evaluatedRules;

    if (!matchedRule) {
      // No rule matched (and no DEFAULT) — mark step as failed
      stepLog.status = 'failed';
      stepLog.error_message = ruleError || 'No matching rule found (including DEFAULT)';
      stepLog.ended_at = new Date();
      execution.logs.push(stepLog);
      execution.status = 'failed';
      execution.ended_at = new Date();
      await execution.save();
      return execution;
    }

    const nextStepId = matchedRule.next_step_id;
    const nextStep = nextStepId ? await Step.findById(nextStepId) : null;

    stepLog.selected_next_step = nextStep ? nextStep.name : (nextStepId ? nextStepId : 'END');
    stepLog.status = 'completed';
    stepLog.ended_at = new Date();
    execution.logs.push(stepLog);

    currentStepId = nextStepId;
    execution.current_step_id = nextStepId;

    if (!nextStepId) {
      // Workflow completed
      execution.status = 'completed';
      execution.ended_at = new Date();
      await execution.save();
      return execution;
    }

    await execution.save();
  }

  // If we exit loop without next step set
  execution.status = 'completed';
  execution.ended_at = new Date();
  await execution.save();
  return execution;
}

/**
 * Process approval for current in-progress approval step
 */
async function approveStep(executionId, approverId, approved) {
  const execution = await Execution.findById(executionId);
  if (!execution) throw new Error('Execution not found');
  if (execution.status !== 'in_progress') throw new Error('Execution is not in progress');

  const currentStepId = execution.current_step_id;
  const step = await Step.findById(currentStepId);
  if (!step || step.step_type !== 'approval') {
    throw new Error('Current step is not an approval step');
  }

  // Update the last log entry for this step
  const lastLog = execution.logs[execution.logs.length - 1];
  if (lastLog && lastLog.step_id === currentStepId) {
    lastLog.approver_id = approverId;
    lastLog.status = approved ? 'completed' : 'failed';
    lastLog.ended_at = new Date();
  }

  if (!approved) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    execution.logs[execution.logs.length - 1].error_message = 'Approval rejected';
    await execution.save();
    return execution;
  }

  // Evaluate rules and move to next step
  const rules = await Rule.find({ step_id: currentStepId }).sort({ priority: 1 });
  const { matchedRule, evaluatedRules } = evaluateRules(rules, execution.data);

  if (lastLog && lastLog.step_id === currentStepId) {
    lastLog.evaluated_rules = evaluatedRules;
  }

  if (!matchedRule) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    if (lastLog) lastLog.error_message = 'No matching rule after approval';
    await execution.save();
    return execution;
  }

  const nextStepId = matchedRule.next_step_id;
  if (lastLog) {
    const nextStep = nextStepId ? await Step.findById(nextStepId) : null;
    lastLog.selected_next_step = nextStep ? nextStep.name : (nextStepId ? nextStepId : 'END');
  }

  execution.current_step_id = nextStepId;
  await execution.save();

  if (!nextStepId) {
    execution.status = 'completed';
    execution.ended_at = new Date();
    await execution.save();
    return execution;
  }

  // Continue execution with next step
  return await runExecution(executionId);
}

module.exports = { runExecution, approveStep };
