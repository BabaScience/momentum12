import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  FrequencyType,
  IHabitFrequency,
  IHabitReminders,
  IHabitAppearance,
  IStreakData,
  IHabitStatistics,
} from '../types/index.js';

export interface IHabitDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  planId?: Types.ObjectId;
  name: string;
  description?: string;
  frequency: IHabitFrequency;
  reminders: IHabitReminders;
  appearance: IHabitAppearance;
  streakData: IStreakData;
  statistics: IHabitStatistics;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateStreak(completed: boolean, executionDate?: Date): Promise<void>;
  incrementCompletions(timeSpent?: number): Promise<void>;
}

interface IHabitModel extends Model<IHabitDocument> {
  findActiveByUser(userId: Types.ObjectId): Promise<IHabitDocument[]>;
  findByPlan(planId: Types.ObjectId): Promise<IHabitDocument[]>;
}

const frequencySchema = new Schema<IHabitFrequency>(
  {
    type: {
      type: String,
      enum: Object.values(FrequencyType),
      required: [true, 'Frequency type is required'],
      default: FrequencyType.DAILY,
    },
    daysOfWeek: {
      type: [Number],
      default: undefined,
      validate: {
        validator: function (days: number[]) {
          if (!days || days.length === 0) return true;
          return days.every((d) => d >= 0 && d <= 6);
        },
        message: 'Days of week must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
    timesPerWeek: {
      type: Number,
      min: [1, 'Times per week must be at least 1'],
      max: [7, 'Times per week cannot exceed 7'],
      default: undefined,
    },
  },
  { _id: false }
);

const remindersSchema = new Schema<IHabitReminders>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    times: {
      type: [String],
      default: [],
      validate: {
        validator: function (times: string[]) {
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          return times.every((t) => timeRegex.test(t));
        },
        message: 'Invalid time format. Use HH:mm',
      },
    },
    sound: {
      type: String,
      default: 'default',
    },
  },
  { _id: false }
);

const appearanceSchema = new Schema<IHabitAppearance>(
  {
    iconName: {
      type: String,
      required: [true, 'Icon name is required'],
      trim: true,
      default: 'check-circle',
    },
    colorHex: {
      type: String,
      required: [true, 'Color is required'],
      trim: true,
      default: '#2196F3',
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'],
    },
    emoji: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
);

const streakDataSchema = new Schema<IStreakData>(
  {
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
    targetStreak: {
      type: Number,
      default: 30,
      min: 1,
    },
    lastCompletedDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const statisticsSchema = new Schema<IHabitStatistics>(
  {
    totalCompletions: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageTimeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const habitSchema = new Schema<IHabitDocument, IHabitModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TwelveWeekPlan',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Habit name is required'],
      trim: true,
      minlength: [2, 'Habit name must be at least 2 characters'],
      maxlength: [50, 'Habit name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: undefined,
    },
    frequency: {
      type: frequencySchema,
      required: true,
      default: () => ({ type: FrequencyType.DAILY }),
    },
    reminders: {
      type: remindersSchema,
      default: () => ({
        enabled: false,
        times: [],
        sound: 'default',
      }),
    },
    appearance: {
      type: appearanceSchema,
      required: true,
      default: () => ({
        iconName: 'check-circle',
        colorHex: '#2196F3',
      }),
    },
    streakData: {
      type: streakDataSchema,
      default: () => ({
        currentStreak: 0,
        longestStreak: 0,
        targetStreak: 30,
      }),
    },
    statistics: {
      type: statisticsSchema,
      default: () => ({
        totalCompletions: 0,
        averageTimeSpent: 0,
        completionRate: 0,
      }),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
habitSchema.index({ userId: 1, isActive: 1 });
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ planId: 1 });
habitSchema.index({ 'frequency.type': 1, userId: 1 });

// Instance methods
habitSchema.methods.updateStreak = async function (
  completed: boolean,
  executionDate: Date = new Date()
): Promise<void> {
  const today = new Date(executionDate);
  today.setHours(0, 0, 0, 0);

  if (completed) {
    const lastCompleted = this.streakData.lastCompletedDate
      ? new Date(this.streakData.lastCompletedDate)
      : null;

    if (lastCompleted) {
      lastCompleted.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day
        this.streakData.currentStreak += 1;
      } else if (daysDiff > 1) {
        // Streak broken, start new
        this.streakData.currentStreak = 1;
      }
      // daysDiff === 0 means same day, no change to streak
    } else {
      // First completion
      this.streakData.currentStreak = 1;
    }

    this.streakData.lastCompletedDate = today;

    if (this.streakData.currentStreak > this.streakData.longestStreak) {
      this.streakData.longestStreak = this.streakData.currentStreak;
    }
  }

  await this.save();
};

habitSchema.methods.incrementCompletions = async function (timeSpent?: number): Promise<void> {
  this.statistics.totalCompletions += 1;

  if (timeSpent !== undefined && timeSpent > 0) {
    // Update running average
    const total = this.statistics.averageTimeSpent * (this.statistics.totalCompletions - 1);
    this.statistics.averageTimeSpent =
      (total + timeSpent) / this.statistics.totalCompletions;
  }

  await this.save();
};

// Static methods
habitSchema.statics.findActiveByUser = function (
  userId: Types.ObjectId
): Promise<IHabitDocument[]> {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

habitSchema.statics.findByPlan = function (planId: Types.ObjectId): Promise<IHabitDocument[]> {
  return this.find({ planId, isActive: true }).sort({ createdAt: -1 });
};

export const Habit = mongoose.model<IHabitDocument, IHabitModel>('Habit', habitSchema);

