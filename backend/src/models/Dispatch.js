import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchemeRegistration',
      required: true,
      index: true,
    },
    dispatchDate: { type: Date, required: [true, 'Dispatch date is required'] },
    billNumber: {
      type: String,
      required: [true, 'Sales bill number is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: 40,
    },
    vehicleNumber: { type: String, trim: true, uppercase: true, maxlength: 20 },
    cases250ml: { type: Number, default: 0, min: 0 },
    cases500ml: { type: Number, default: 0, min: 0 },
    cases1l: { type: Number, default: 0, min: 0 },
    totalCases: { type: Number, default: 0, min: 0 },
    remarks: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

dispatchSchema.pre('validate', function computeTotal(next) {
  this.totalCases = (this.cases250ml || 0) + (this.cases500ml || 0) + (this.cases1l || 0);
  next();
});

export default mongoose.model('Dispatch', dispatchSchema);
