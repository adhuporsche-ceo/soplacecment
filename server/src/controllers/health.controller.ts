import { Request, Response } from 'express';
import { isDatabaseConnected } from '../config/database.ts';
import { config } from '../config/index.ts';
import { ConnectionTestModel } from '../models/connection-test.model.ts';

function isLocalRequest(req: Request): boolean {
  const address = req.socket.remoteAddress || req.ip || '';
  return address === '::1' ||
    address === '127.0.0.1' ||
    address.startsWith('::ffff:127.');
}

function databaseErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

export class HealthController {
  public static getHealth(_req: Request, res: Response) {
    const connected = isDatabaseConnected();
    return res.status(connected ? 200 : 503).json({
      success: connected,
      server: 'running',
      database: {
        status: connected ? 'connected' : 'disconnected',
      },
    });
  }

  public static async runDatabaseConnectionTest(req: Request, res: Response) {
    if (config.nodeEnv !== 'development') {
      return res.status(404).json({ success: false, error: 'Not found.' });
    }
    if (!isLocalRequest(req)) {
      return res.status(403).json({ success: false, error: 'This operation is available only from localhost.' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, error: 'MongoDB is not connected.' });
    }

    try {
      const created = await ConnectionTestModel.create({
        testName: 'Local Atlas connection verification',
        status: 'connected',
      });
      const retrieved = await ConnectionTestModel.findById(created._id).lean();

      if (!retrieved) {
        console.error('[database-test] Inserted connection test could not be retrieved.');
        return res.status(500).json({ success: false, error: 'Database verification read-back failed.' });
      }

      return res.status(201).json({
        success: true,
        database: config.mongoDbName,
        collection: 'system_connection_tests',
        record: {
          testName: retrieved.testName,
          status: retrieved.status,
          createdAt: retrieved.createdAt,
        },
      });
    } catch (error) {
      console.error(`[database-test] MongoDB operation failed (${databaseErrorName(error)}).`);
      return res.status(503).json({
        success: false,
        error: 'MongoDB connection test operation failed.',
      });
    }
  }
}
