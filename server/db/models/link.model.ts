import mongoose, { Document, Schema } from 'mongoose';
import { Link } from '@shared/schema';
import { nanoid } from 'nanoid';

const linkSchema = new Schema({
  shortCode: {
    type: String,
    required: true,
    trim: true,
    default: () => nanoid(7)
  },
  originalUrl: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  clickCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  customAlias: {
    type: String,
    default: null,
  }
});

// Indexes for performance
linkSchema.index({ userId: 1 });
linkSchema.index({ createdAt: 1 });
linkSchema.index({ expiresAt: 1 });

export interface LinkDocument extends Document {
  _id: mongoose.Types.ObjectId;
  shortCode: string;
  originalUrl: string;
  userId: mongoose.Types.ObjectId;
  title?: string;
  description?: string;
  createdAt: Date;
  expiresAt: Date | null;
  clickCount: number;
  isActive: boolean;
  isCustom: boolean;
  customAlias: string | null;
  // Add any additional methods for the link model
}

export const LinkModel = mongoose.models.Link || mongoose.model<LinkDocument>('Link', linkSchema);