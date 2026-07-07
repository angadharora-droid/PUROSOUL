import mongoose from 'mongoose';

/** Simple key/value store for app-level configuration managed from the UI. */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
