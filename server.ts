import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './server/src/routes/api.routes.ts';
import { config } from './server/src/config/index.ts';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './server/src/config/database.ts';
import { db } from './server/src/repositories/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }

  await connectDatabase();
  await db.initialize();

  const app = express();
  const server = http.createServer(app);

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount API Routes (support both /api and /api/v1)
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const databaseConnected = isDatabaseConnected();
    res.status(databaseConnected ? 200 : 503).json({
      status: databaseConnected ? 'healthy' : 'unavailable',
      app: 'StudentInsight Placement Management',
      database: databaseConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = config.port;

  if (!isProduction) {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`[StudentInsight] Server listening on http://0.0.0.0:${port}`);
  });

  const shutdown = (signal: string) => {
    console.info(`[StudentInsight] ${signal} received; closing server.`);
    server.close(() => {
      void disconnectDatabase()
        .then(() => process.exit(0))
        .catch(() => {
          console.error('[StudentInsight] Database disconnect failed during shutdown.');
          process.exit(1);
        });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch(err => {
  console.error(
    'Failed to start StudentInsight:',
    err instanceof Error ? err.message : 'Unknown startup error',
  );
  process.exit(1);
});
