import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const uploadDir = path.resolve(env.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'Only JPG, PNG, WEBP images or PDF files are allowed'));
  },
});

export default upload;
