import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'image', 'text', 'drive_link'],
      default: 'drive_link',
    },
    title: { type: String, trim: true, required: true },
    driveLink: { type: String, trim: true },
    fileId: { type: mongoose.Schema.Types.ObjectId },
    textContent: { type: String },
    allowDownload: { type: Boolean, default: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);

export default Note;
