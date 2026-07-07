import mongoose from 'mongoose';
import { PAYMENT_MODES, REGISTRATION_STATUSES } from '../config/constants.js';

/**
 * Scheme terms are snapshotted at registration time so that later edits to the
 * scheme master never change the terms of a running registration.
 */
const schemeSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    advanceAmount: { type: Number, required: true },
    benefitPerCase: { type: Number, required: true },
    targetCases: { type: Number, required: true },
    validityDays: { type: Number, required: true },
  },
  { _id: false }
);

const schemeRegistrationSchema = new mongoose.Schema(
  {
    partyName: { type: String, required: [true, 'Party name is required'], trim: true, maxlength: 120 },
    scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true },
    schemeSnapshot: { type: schemeSnapshotSchema, required: true },
    registrationDate: { type: Date, required: true, default: Date.now },
    advanceAmount: { type: Number, required: [true, 'Advance payment is required'], min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: [true, 'Payment mode is required'] },
    utrNumber: { type: String, trim: true, uppercase: true, maxlength: 60 },
    screenshotUrl: { type: String, required: [true, 'Payment attachment is required'] },
    remarks: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: REGISTRATION_STATUSES, default: 'ACTIVE', index: true },
    activationDate: { type: Date },
    expiryDate: { type: Date },
    completedAt: { type: Date },
    currentCases: { type: Number, default: 0, min: 0 },
    benefitEarned: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

schemeRegistrationSchema.index({ partyName: 1 });
schemeRegistrationSchema.index({ status: 1, expiryDate: 1 });

export default mongoose.model('SchemeRegistration', schemeRegistrationSchema);
