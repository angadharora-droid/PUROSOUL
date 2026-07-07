import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Scheme name is required'], trim: true, unique: true, maxlength: 120 },
    advanceAmount: { type: Number, required: [true, 'Advance payment is required'], min: 0 },
    benefitPerCase: { type: Number, required: [true, 'Benefit per case is required'], min: 0 },
    targetCases: { type: Number, required: [true, 'Sales target is required'], min: 1 },
    validityDays: { type: Number, required: [true, 'Validity is required'], min: 1 },
    description: { type: String, trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Scheme', schemeSchema);
