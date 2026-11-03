import mongoose, { Schema } from 'mongoose';

export interface ConnectionTest {
  testName: string;
  status: string;
  createdAt: Date;
}

const connectionTestSchema = new Schema<ConnectionTest>(
  {
    testName: { type: String, required: true },
    status: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: 'system_connection_tests',
    versionKey: false,
  },
);

export const ConnectionTestModel =
  mongoose.models.ConnectionTest ||
  mongoose.model<ConnectionTest>('ConnectionTest', connectionTestSchema);
