import mongoose from 'mongoose';

/**
 * Every distinct party name seen in an imported sales workbook (the Tally
 * "Particulars" column). Upserted on each report import and served as the
 * party-name suggestions on the New Registration form, so registrations are
 * spelled exactly as the vendor's ledger spells them and dispatch matching
 * never misses on a typo.
 */
const partySchema = new mongoose.Schema(
  {
    // Normalized (uppercased, whitespace-collapsed) name — the dedup key,
    // same normalization the dispatch import matches registrations with.
    key: { type: String, required: true, unique: true },
    // The name as printed in the report, for display.
    name: { type: String, required: true, trim: true, maxlength: 200 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Party', partySchema);
