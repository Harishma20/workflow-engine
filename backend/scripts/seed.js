/**
 * Seed Script — Creates 2 sample workflows with steps and rules.
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Workflow = require('../src/models/Workflow');
const Step = require('../src/models/Step');
const Rule = require('../src/models/Rule');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clean up existing sample data (by name)
  const existing = await Workflow.find({ name: { $in: ['Expense Approval', 'Employee Onboarding'] } });
  for (const wf of existing) {
    const steps = await Step.find({ workflow_id: wf._id });
    for (const s of steps) await Rule.deleteMany({ step_id: s._id });
    await Step.deleteMany({ workflow_id: wf._id });
    await Workflow.findByIdAndDelete(wf._id);
  }

  // ================================================================
  // WORKFLOW 1: Expense Approval
  // ================================================================
  const wf1Id = uuidv4();
  const s1 = { _id: uuidv4(), name: 'Manager Approval', step_type: 'approval', order: 1, metadata: { assignee_email: 'manager@example.com' }, workflow_id: wf1Id };
  const s2 = { _id: uuidv4(), name: 'Finance Notification', step_type: 'notification', order: 2, metadata: { assignee_email: 'finance@example.com', channel: 'email' }, workflow_id: wf1Id };
  const s3 = { _id: uuidv4(), name: 'CEO Approval', step_type: 'approval', order: 3, metadata: { assignee_email: 'ceo@example.com' }, workflow_id: wf1Id };
  const s4 = { _id: uuidv4(), name: 'Task Rejection', step_type: 'task', order: 4, metadata: { action: 'reject_expense' }, workflow_id: wf1Id };
  const s5 = { _id: uuidv4(), name: 'Task Completion', step_type: 'task', order: 5, metadata: { action: 'complete_expense' }, workflow_id: wf1Id };

  await Step.insertMany([s1, s2, s3, s4, s5]);

  const wf1 = new Workflow({
    _id: wf1Id,
    name: 'Expense Approval',
    description: 'Multi-level expense approval workflow with dynamic routing based on amount, country, and priority.',
    version: 3,
    is_active: true,
    input_schema: {
      amount:     { type: 'number', required: true },
      country:    { type: 'string', required: true },
      department: { type: 'string', required: false },
      priority:   { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] },
    },
    start_step_id: s1._id,
  });
  await wf1.save();

  // Rules for Manager Approval (s1) 
  await Rule.insertMany([
    { _id: uuidv4(), step_id: s1._id, condition: "amount > 100 && country == 'US' && priority == 'High'", next_step_id: s2._id, priority: 1 },
    { _id: uuidv4(), step_id: s1._id, condition: "amount <= 100 || department == 'HR'", next_step_id: s3._id, priority: 2 },
    { _id: uuidv4(), step_id: s1._id, condition: "priority == 'Low' && country != 'US'", next_step_id: s4._id, priority: 3 },
    { _id: uuidv4(), step_id: s1._id, condition: 'DEFAULT', next_step_id: s4._id, priority: 4 },
  ]);

  // Rules for Finance Notification (s2) — routes to CEO for high amounts
  await Rule.insertMany([
    { _id: uuidv4(), step_id: s2._id, condition: 'amount > 10000', next_step_id: s3._id, priority: 1 },
    { _id: uuidv4(), step_id: s2._id, condition: 'DEFAULT', next_step_id: s5._id, priority: 2 },
  ]);

  // Rules for CEO Approval (s3)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: s3._id, condition: 'DEFAULT', next_step_id: s5._id, priority: 1 },
  ]);

  // Rules for Task Rejection (s4) — ends workflow
  await Rule.insertMany([
    { _id: uuidv4(), step_id: s4._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  // Rules for Task Completion (s5) — ends workflow
  await Rule.insertMany([
    { _id: uuidv4(), step_id: s5._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  console.log(`✅ Created Workflow: Expense Approval (${wf1Id})`);

  // ================================================================
  // WORKFLOW 2: Employee Onboarding
  // ================================================================
  const wf2Id = uuidv4();
  const o1 = { _id: uuidv4(), name: 'Send Welcome Email', step_type: 'notification', order: 1, metadata: { channel: 'email', template: 'welcome' }, workflow_id: wf2Id };
  const o2 = { _id: uuidv4(), name: 'IT Setup Task', step_type: 'task', order: 2, metadata: { action: 'provision_accounts' }, workflow_id: wf2Id };
  const o3 = { _id: uuidv4(), name: 'Manager Introduction', step_type: 'approval', order: 3, metadata: { assignee_email: 'hr@example.com' }, workflow_id: wf2Id };
  const o4 = { _id: uuidv4(), name: 'Remote Setup', step_type: 'task', order: 4, metadata: { action: 'ship_equipment' }, workflow_id: wf2Id };
  const o5 = { _id: uuidv4(), name: 'Onboarding Complete', step_type: 'notification', order: 5, metadata: { channel: 'slack', template: 'onboarding_done' }, workflow_id: wf2Id };

  await Step.insertMany([o1, o2, o3, o4, o5]);

  const wf2 = new Workflow({
    _id: wf2Id,
    name: 'Employee Onboarding',
    description: 'Automates the new employee onboarding process with remote/on-site branching.',
    version: 1,
    is_active: true,
    input_schema: {
      employee_name:  { type: 'string', required: true },
      department:     { type: 'string', required: true },
      is_remote:      { type: 'boolean', required: true },
      start_date:     { type: 'string', required: true },
    },
    start_step_id: o1._id,
  });
  await wf2.save();

  // Rules for Send Welcome Email (o1)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: o1._id, condition: 'DEFAULT', next_step_id: o2._id, priority: 1 },
  ]);
  // Rules for IT Setup (o2)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: o2._id, condition: 'DEFAULT', next_step_id: o3._id, priority: 1 },
  ]);
  // Rules for Manager Introduction (o3)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: o3._id, condition: 'is_remote == true', next_step_id: o4._id, priority: 1 },
    { _id: uuidv4(), step_id: o3._id, condition: 'DEFAULT', next_step_id: o5._id, priority: 2 },
  ]);
  // Rules for Remote Setup (o4)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: o4._id, condition: 'DEFAULT', next_step_id: o5._id, priority: 1 },
  ]);
  // Rules for Onboarding Complete (o5)
  await Rule.insertMany([
    { _id: uuidv4(), step_id: o5._id, condition: 'DEFAULT', next_step_id: null, priority: 1 },
  ]);

  console.log(`✅ Created Workflow: Employee Onboarding (${wf2Id})`);
  console.log('\nSeed complete! Sample workflow IDs:');
  console.log(`  Expense Approval:    ${wf1Id}`);
  console.log(`  Employee Onboarding: ${wf2Id}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
