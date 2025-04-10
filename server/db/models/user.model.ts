import mongoose, { Document, Schema } from 'mongoose';
import { User } from '@shared/schema';
import bcrypt from 'bcrypt';

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    default: null,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Add a pre-save hook to hash passwords before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export interface UserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string | null;
  password: string;
  createdAt: Date;
  // Add any additional methods for the user model
  comparePassword(password: string): Promise<boolean>;
}

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema);