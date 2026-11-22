import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    codeSnippet: {
      type: String,
      default: '',
    },
    options: {
      type: [String],
      required: true,
      validate: [(val) => Array.isArray(val) && val.length >= 2, 'At least 2 options are required'],
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['Linux', 'AWS', 'DevOps', 'AI', 'Full Stack', 'Python', 'Communication', 'General'],
      default: 'General',
    },
    targetBatches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
      },
    ],
    isAllBatches: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 30, // in minutes
    },
    passPercentage: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 50,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      default: 'draft',
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: 'Trainer',
      trim: true,
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

// Automatically keep totalMarks in sync with question count (1 mark per MCQ)
examSchema.pre('save', function (next) {
  if (this.questions && Array.isArray(this.questions)) {
    this.totalMarks = this.questions.length;
  }
  next();
});

examSchema.index({ status: 1, createdAt: -1 });
examSchema.index({ targetBatches: 1 });

export default mongoose.model('Exam', examSchema);
