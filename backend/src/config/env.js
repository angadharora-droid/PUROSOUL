import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scheme-tracker',
  // Comma-separated list of allowed frontend origins; trailing slashes are stripped
  // because browser Origin headers never include them.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Scheme Tracker <no-reply@company.com>',
  },
  accountsEmail: process.env.ACCOUNTS_EMAIL || '',
  // Mailbox the vendor's daily sales report arrives in (read via IMAP by
  // src/jobs/fetchDispatchEmail.js).
  reportMail: {
    host: process.env.REPORT_IMAP_HOST || 'imap.rediffmailpro.com',
    port: Number(process.env.REPORT_IMAP_PORT) || 993,
    user: process.env.REPORT_EMAIL_USER || 'report@cpgh.in',
    pass: process.env.REPORT_EMAIL_PASSWORD || '',
    // How far back the first run searches for report emails (later runs resume
    // from the last processed email instead).
    lookbackDays: Number(process.env.REPORT_LOOKBACK_DAYS) || 45,
  },
};

export default env;
