const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  task_title: {
    type: String,
    required: true,
    trim: true
  },
  task_description: {
    type: String,
    required: true
  },
  assigned_to: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  due_date: {
    type: Date,
    required: true
  },
  client_name: {
    type: String,
    required: true
  },
  project_name: {
    type: String,
    required: true
  },
  created_by: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Unassigned', 'Assigned', 'In Progress', 'Closed'],
    default: 'Unassigned'
  }
}, {
  timestamps: true
});

// Index for better performance
taskSchema.index({ status: 1 });
taskSchema.index({ due_date: 1 });

module.exports = mongoose.model('Task', taskSchema);