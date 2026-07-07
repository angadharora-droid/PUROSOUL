import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    message: { type: String, trim: true, maxlength: 500 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'SchemeRegistration', index: true },
    scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('AuditLog', auditLogSchema);
