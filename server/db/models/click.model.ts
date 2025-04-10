import mongoose, { Document, Schema } from 'mongoose';
import { Click } from '@shared/schema';

const clickSchema = new Schema({
  linkId: {
    type: Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },
  device: {
    type: String,
    default: null,
  },
  browser: {
    type: String,
    default: null,
  },
  os: {
    type: String,
    default: null,
  },
  referrer: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
});

// Indexes for performance and analytics queries
clickSchema.index({ linkId: 1 });
clickSchema.index({ timestamp: 1 });
clickSchema.index({ device: 1 });
clickSchema.index({ browser: 1 });
clickSchema.index({ os: 1 });
clickSchema.index({ country: 1 });

export interface ClickDocument extends Document {
  _id: mongoose.Types.ObjectId;
  linkId: mongoose.Types.ObjectId;
  timestamp: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  country: string | null;
  // Add any additional methods for the click model
}

export const ClickModel = mongoose.models.Click || mongoose.model<ClickDocument>('Click', clickSchema);