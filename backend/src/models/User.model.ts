import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import {
  IUserProfile,
  IUserPreferences,
  IUserStatistics,
  Theme,
  WeekStartDay,
  PreferredUnits,
} from '../types/index.js';

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  profile: IUserProfile;
  preferences: IUserPreferences;
  statistics: IUserStatistics;
  refreshTokens: string[];
  createdAt: Date;
  lastActiveAt: Date;
  
  // Methods
  comparePassword(password: string): Promise<boolean>;
  addRefreshToken(token: string): Promise<void>;
  removeRefreshToken(token: string): Promise<void>;
  hasRefreshToken(token: string): boolean;
  clearAllRefreshTokens(): Promise<void>;
}

interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
}

const userSchema = new Schema<IUserDocument, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [60, 'Invalid password hash'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    profile: {
      avatarUrl: {
        type: String,
        default: null,
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
      weekStartDay: {
        type: String,
        enum: Object.values(WeekStartDay),
        default: WeekStartDay.MONDAY,
      },
      preferredUnits: {
        type: String,
        enum: Object.values(PreferredUnits),
        default: PreferredUnits.METRIC,
      },
    },
    preferences: {
      notifications: {
        dailyReminder: {
          type: Boolean,
          default: true,
        },
        weeklyReview: {
          type: Boolean,
          default: true,
        },
        streakMilestones: {
          type: Boolean,
          default: true,
        },
        reminderTime: {
          type: String,
          default: '08:00',
          match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'],
        },
      },
      theme: {
        type: String,
        enum: Object.values(Theme),
        default: Theme.AUTO,
      },
      hapticFeedback: {
        type: Boolean,
        default: true,
      },
    },
    statistics: {
      currentStreak: {
        type: Number,
        default: 0,
        min: 0,
      },
      longestStreak: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalHabitsCompleted: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalPlansCreated: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageWeeklyScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastActiveAt: -1 });

// Static methods
userSchema.statics.findByEmail = function (email: string): Promise<IUserDocument | null> {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance methods
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.addRefreshToken = async function (token: string): Promise<void> {
  // Keep only the last 5 refresh tokens (for multiple devices)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens.shift();
  }
  this.refreshTokens.push(token);
  await this.save();
};

userSchema.methods.removeRefreshToken = async function (token: string): Promise<void> {
  this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
  await this.save();
};

userSchema.methods.hasRefreshToken = function (token: string): boolean {
  return this.refreshTokens.includes(token);
};

userSchema.methods.clearAllRefreshTokens = async function (): Promise<void> {
  this.refreshTokens = [];
  await this.save();
};

// Hash password helper
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.bcrypt.saltRounds);
};

export const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);

