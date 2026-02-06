import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  chatId: number;
  isEnabled: boolean;
  frequency: number;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    chatId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      required: true,
    },
    frequency: {
      type: Number,
      default: 1,
      required: true,
      min: 1,
      max: 1440,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);
