const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // UUID
  workflow_id: { type: String, required: true, ref: 'Workflow' },
  name: { type: String, required: true, trim: true },
  step_type: {
    type: String,
    enum: ['task', 'approval', 'notification'],
    required: true,
  },
  order: { type: Number, required: true, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
});

stepSchema.index({ workflow_id: 1, order: 1 });

module.exports = mongoose.model('Step', stepSchema);
