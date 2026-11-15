import mongoose from 'mongoose';

const privateNoteSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    text: { type: String, default: '' },
  },
  { timestamps: true }
);

privateNoteSchema.index({ student: 1, lecture: 1 }, { unique: true });

const PrivateNote = mongoose.model('PrivateNote', privateNoteSchema);

export default PrivateNote;
