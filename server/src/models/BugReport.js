import mongoose from 'mongoose';

const bugReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },
    reporterEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    reporterRole: {
      type: String,
      enum: ['student', 'trainer', 'guest'],
      default: 'student',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'ui_glitch',
      trim: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    stepsToReproduce: {
      type: String,
      default: '',
      trim: true,
    },
    screenshotFileName: {
      type: String,
      default: null,
    },
    screenshotOriginalName: {
      type: String,
      default: null,
    },
    voiceNoteFileName: {
      type: String,
      default: null,
    },
    voiceNoteDuration: {
      type: Number,
      default: 0, // Duration in seconds
    },
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
    },
    devNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

bugReportSchema.index({ status: 1 });
bugReportSchema.index({ createdAt: -1 });

const BugReport = mongoose.model('BugReport', bugReportSchema);

export default BugReport;
