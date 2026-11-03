import mongoose from 'mongoose';
import { config } from './index.ts';

let intentionalDisconnect = false;

function getConnectionDiagnostic(error: unknown): string {
  const mongoError = error as { name?: string; message?: string; code?: number };
  const message = mongoError.message || '';

  if (mongoError.name === 'MongoParseError') {
    return 'Invalid MongoDB connection URI. Check the Atlas URI format and database name.';
  }
  if (mongoError.code === 18 || /authentication failed/i.test(message)) {
    return 'MongoDB authentication failed. Check the Atlas database username and password.';
  }
  if (mongoError.code === 13 || /not authorized|unauthorized/i.test(message)) {
    return 'The Atlas database user does not have permission to access the selected database.';
  }
  if (/ENOTFOUND|querySrv|DNS/i.test(message)) {
    return 'MongoDB DNS resolution failed. Check the cluster hostname and DNS/network configuration.';
  }
  if (/timed out|ETIMEDOUT|ECONNREFUSED|MongooseServerSelectionError/i.test(`${mongoError.name} ${message}`)) {
    return 'MongoDB is unavailable or unreachable. Check Atlas IP Access List, network/firewall access, and cluster status.';
  }

  return `MongoDB connection failed (${mongoError.name || 'unknown error'}).`;
}

mongoose.connection.on('error', error => {
  console.error(`[database] Connection error: ${getConnectionDiagnostic(error)}`);
});

mongoose.connection.on('disconnected', () => {
  if (!intentionalDisconnect) {
    console.warn('[database] MongoDB connection was lost.');
  }
});

mongoose.connection.on('reconnected', () => {
  console.info('[database] MongoDB connection restored.');
});

export async function connectDatabase(databaseName = config.mongoDbName): Promise<void> {
  if (!config.mongoUri) {
    throw new Error('MONGODB_URI is required; server startup cancelled.');
  }
  if (!config.mongoDbName) {
    throw new Error('MONGODB_DB_NAME is required; server startup cancelled.');
  }

  try {
    await mongoose.connect(config.mongoUri, { dbName: databaseName });
    await mongoose.connection.db?.admin().command({ ping: 1 });
    console.info(`[database] Connected to MongoDB database "${databaseName}".`);
  } catch (error) {
    const diagnostic = getConnectionDiagnostic(error);
    console.error(`[database] ${diagnostic}`);
    throw new Error(diagnostic);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  intentionalDisconnect = true;
  try {
    await mongoose.disconnect();
  } finally {
    intentionalDisconnect = false;
  }
}
