const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporterInfo: {
      reporter: { type: mongoose.Schema.Types.ObjectId, refPath: 'reporterInfo.reporterType', required: false },
      reporterType: { type: String, enum: ['User', 'Photographer'], required: false },
    },
    reportType: {
      type: String,
      enum: ['Content Issue', 'User Misconduct', 'Bug Report', ],
      required: true,
    },
    subject: { type: String, required: true },
    description: { type: String, required: true }, 
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    resolutionNotes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
