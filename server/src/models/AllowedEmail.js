import mongoose from 'mongoose';

const allowedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
    },
    registered: {
      type: Boolean,
      default: false,
    },
    registeredAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const AllowedEmail = mongoose.model('AllowedEmail', allowedEmailSchema);

export default AllowedEmail;
