import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'AI Lectures',
        'AWS Lectures',
        'DevOps Lectures',
        'Communication Skill Lectures',
        'Job Portal Optimization + Resume Building Session',
      ],
      default: 'AI Lectures',
      required: true,
    },
    driveFileId: { type: String },
    driveLink: { type: String },
    recordedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed'],
      default: 'queued',
    },
    progressPercent: { type: Number, default: 0 },
    errorMessage: { type: String },
    duration: { type: Number },
    availableQualities: [{ type: String }],
    hlsPath: { type: String },
    encryptionKeyHex: { type: String },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.driveLink;
        delete ret.driveFileId;
        delete ret.encryptionKeyHex;
        delete ret.__v;
        return ret;
      },
    },
  }
);

lectureSchema.index({ batch: 1 });
lectureSchema.index({ category: 1 });
lectureSchema.index({ status: 1 });

/**
 * Returns a plain object safe for student consumption.
 * Strips sensitive / internal fields.
 */
lectureSchema.methods.toStudentJSON = function () {
  const obj = this.toObject();
  delete obj.driveLink;
  delete obj.driveFileId;
  delete obj.encryptionKeyHex;
  delete obj.errorMessage;
  delete obj.__v;
  return obj;
};

const Lecture = mongoose.model('Lecture', lectureSchema);

export default Lecture;
