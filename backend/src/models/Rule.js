const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  step_id: { type: String, required: true, ref: 'Step' },
  condition: { type: String, required: true }, // e.g. "amount > 100 && country == 'US'" or "DEFAULT"
  next_step_id: { type: String, default: null }, // null means end workflow
  priority: { type: Number, required: true, default: 999 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
});

ruleSchema.index({ step_id: 1, priority: 1 });

module.exports = mongoose.model('Rule', ruleSchema);
