import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      default: 'Pune / Hybrid',
      trim: true,
    },
    jobType: {
      type: String,
      enum: ['Full-time', 'Internship', 'Contract', 'Part-time'],
      default: 'Full-time',
    },
    experience: {
      type: String,
      default: '0-2 Years / Freshers',
      trim: true,
    },
    salary: {
      type: String,
      default: 'Competitive / Best in Industry',
      trim: true,
    },
    applyUrl: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    targetBatch: {
      type: String,
      default: 'All Batches',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    deadline: {
      type: Date,
      default: null,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postedByName: {
      type: String,
      default: 'Mentore Solution Placement Team',
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

jobSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Job', jobSchema);
