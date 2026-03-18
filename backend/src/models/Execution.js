const mongoose = require('mongoose');

const stepLogSchema = new mongoose.Schema({
  step_id: String,
  step_name: String,
  step_type: String,
  evaluated_rules: [mongoose.Schema.Types.Mixed],
  selected_next_step: { type: String, default: null },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'], default: 'pending' },
  approver_id: { type: String, default: null },
  error_message: { type: String, default: null },
  started_at: Date,
  ended_at: Date,
  iteration: { type: Number, default: 0 },
}, { _id: false });

const executionSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  workflow_id: { type: String, required: true, ref: 'Workflow' },
  workflow_version: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'canceled'],
    default: 'pending',
  },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  logs: [stepLogSchema],
  current_step_id: { type: String, default: null },
  retries: { type: Number, default: 0 },
  triggered_by: { type: String, default: 'system' },
  started_at: { type: Date, default: null },
  ended_at: { type: Date, default: null },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
});

executionSchema.index({ workflow_id: 1, status: 1 });
executionSchema.index({ created_at: -1 });

module.exports = mongoose.model('Execution', executionSchema);
