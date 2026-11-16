import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['trainer', 'student'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: { type: String, required: true, maxlength: 1000 },
    videoTimestamp: { type: Number, default: null },
    isAnonymous: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    messages: [messageSchema],
    readByTrainer: { type: Boolean, default: false },
    readByStudent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

questionSchema.index({ lecture: 1 });
questionSchema.index({ trainer: 1 });
questionSchema.index({ batch: 1 });
questionSchema.index({ student: 1 });
questionSchema.index({ status: 1 });

const Question = mongoose.model('Question', questionSchema);

export default Question;
