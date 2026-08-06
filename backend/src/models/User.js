import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';
import { isValidPasswordForRole } from '../utils/credentials.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
      validate: {
        validator(value) {
          return isValidPasswordForRole(value, this.role);
        },
        message: 'Password must be at least 8 characters (admins may use a 4 or 6 digit PIN)',
      },
    },
    role: { type: String, enum: ROLES, required: true, default: 'sales' },
    isActive: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
