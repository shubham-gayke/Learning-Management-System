import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionIndex: {
      type: Number,
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      default: null, // null if left unattempted
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['tab_switch', 'phone_detected', 'fullscreen_exit', 'window_blur'],
      required: true,
    },
    warningNumber: {
      type: Number,
      default: 1,
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const examSubmissionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'terminated'],
      default: 'in_progress',
    },
    terminationReason: {
      type: String,
      default: null,
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    phoneDetectionCount: {
      type: Number,
      default: 0,
    },
    violations: {
      type: [violationSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

examSubmissionSchema.index({ exam: 1, student: 1 });
examSubmissionSchema.index({ exam: 1, batch: 1, score: -1, timeSpentSeconds: 1 });
examSubmissionSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model('ExamSubmission', examSubmissionSchema);
