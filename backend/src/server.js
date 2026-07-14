import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';
import { startDispatchEmailScheduler } from './services/dispatchEmailFetch.service.js';

async function start() {
  try {
    await connectDB();
    const server = app.listen(env.port, () => {
      console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
      console.log(`[uploads] serving payment screenshots from ${env.uploadDir}`);
    });

    // Sales-report auto-import: checks the report mailbox while the server runs.
    startDispatchEmailScheduler();

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${env.port} is already in use — another instance of the API is probably running.\n` +
            `Stop it (or change PORT in .env) and try again.`
        );
        process.exit(1);
      }
      throw err;
    });

    process.on('unhandledRejection', (err) => {
      console.error('Unhandled rejection:', err);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
