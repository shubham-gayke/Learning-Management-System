import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const batchHistorySchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['trainer', 'student'],
      default: 'student',
    },
    // Allowed lecture tracks/categories for trainers (undefined/null = full access)
    allowedCategories: {
      type: [String],
      default: undefined,
    },
    // Whether this trainer has permission to upload notes/resources
    canUploadNotes: {
      type: Boolean,
      default: true,
    },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    batchChangesUsed: { type: Number, default: 0, max: 1 },
    batchHistory: [batchHistorySchema],
    activeSessionId: { type: String, default: null },
    twoFactorSecret: { type: String, default: null, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.twoFactorSecret;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Static: hash a plain-text password ──────────────────────────────
userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

// ── Instance: compare a candidate password against the stored hash ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
