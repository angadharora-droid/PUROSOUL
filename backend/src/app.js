import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrls, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv === 'development') app.use(morgan('dev'));

// Uploaded payment screenshots
app.use('/uploads', express.static(env.uploadDir));

app.get('/', (_req, res) =>
  res.json({
    success: true,
    message: 'Puro Soul Scheme Tracker API',
    health: '/api/health',
    docs: 'https://github.com/angadharora-droid/PUROSOUL#api-overview-all-under-api',
  })
);
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'OK' }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
