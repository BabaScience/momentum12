import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  IHabitExecution,
  IDailyAction,
  IScorecard,
  IReflection,
} from '../types/index.js';

export interface IDailyExecutionDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  executionDate: Date;
  habitExecutions: IHabitExecution[];
  dailyActions: IDailyAction[];
  scorecard: IScorecard;
  reflection?: IReflection;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  calculateScorecard(): void;
  completeHabit(habitId: Types.ObjectId, timeSpent?: number, notes?: string): boolean;
  uncompleteHabit(habitId: Types.ObjectId): boolean;
  completeAction(actionId: Types.ObjectId): boolean;
}

interface IDailyExecutionModel extends Model<IDailyExecutionDocument> {
  findByUserAndDate(userId: Types.ObjectId, date: Date): Promise<IDailyExecutionDocument | null>;
  findByUserDateRange(
    userId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<IDailyExecutionDocument[]>;
  getOrCreateForToday(
    userId: Types.ObjectId,
    planId: Types.ObjectId,
    habitIds: Types.ObjectId[]
  ): Promise<IDailyExecutionDocument>;
}

const habitExecutionSchema = new Schema<IHabitExecution>(
  {
    habitId: {
      type: Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    timeSpentMinutes: {
      type: Number,
      min: 0,
      default: undefined,
    },
    intensityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: undefined,
    },
    notes: {
      type: String,
      maxlength: 500,
      default: undefined,
    },
  },
  { _id: false }
);

const dailyActionSchema = new Schema<IDailyAction>(
  {
    weeklyGoalId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const scorecardSchema = new Schema<IScorecard>(
  {
    habitsScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    actionsScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const reflectionSchema = new Schema<IReflection>(
  {
    wins: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    challenges: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    learnings: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    gratitude: {
      type: String,
      maxlength: 500,
      default: undefined,
    },
  },
  { _id: false }
);

const dailyExecutionSchema = new Schema<IDailyExecutionDocument, IDailyExecutionModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TwelveWeekPlan',
      required: true,
      index: true,
    },
    executionDate: {
      type: Date,
      required: true,
      index: true,
    },
    habitExecutions: {
      type: [habitExecutionSchema],
      default: [],
    },
    dailyActions: {
      type: [dailyActionSchema],
      default: [],
    },
    scorecard: {
      type: scorecardSchema,
      default: () => ({
        habitsScore: 0,
        actionsScore: 0,
        overallScore: 0,
      }),
    },
    reflection: {
      type: reflectionSchema,
      default: undefined,
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

// Compound indexes
dailyExecutionSchema.index({ userId: 1, executionDate: -1 });
dailyExecutionSchema.index({ planId: 1, executionDate: -1 });
dailyExecutionSchema.index(
  { userId: 1, executionDate: -1, 'scorecard.overallScore': -1 }
);

// Ensure unique execution per user per day
dailyExecutionSchema.index(
  { userId: 1, executionDate: 1 },
  { unique: true }
);

// Instance methods
dailyExecutionSchema.methods.calculateScorecard = function (): void {
  const totalHabits = this.habitExecutions.length;
  const completedHabits = this.habitExecutions.filter(
    (h: IHabitExecution) => h.isCompleted
  ).length;

  const totalActions = this.dailyActions.length;
  const completedActions = this.dailyActions.filter(
    (a: IDailyAction) => a.isCompleted
  ).length;

  this.scorecard.habitsScore =
    totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 100;

  this.scorecard.actionsScore =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 100;

  // Weighted score: 60% habits, 40% actions
  this.scorecard.overallScore = Math.round(
    this.scorecard.habitsScore * 0.6 + this.scorecard.actionsScore * 0.4
  );
};

dailyExecutionSchema.methods.completeHabit = function (
  habitId: Types.ObjectId,
  timeSpent?: number,
  notes?: string
): boolean {
  const execution = this.habitExecutions.find(
    (h: IHabitExecution) => h.habitId.toString() === habitId.toString()
  );

  if (!execution) return false;

  execution.isCompleted = true;
  execution.completedAt = new Date();
  if (timeSpent !== undefined) execution.timeSpentMinutes = timeSpent;
  if (notes !== undefined) execution.notes = notes;

  this.calculateScorecard();
  return true;
};

dailyExecutionSchema.methods.uncompleteHabit = function (
  habitId: Types.ObjectId
): boolean {
  const execution = this.habitExecutions.find(
    (h: IHabitExecution) => h.habitId.toString() === habitId.toString()
  );

  if (!execution) return false;

  execution.isCompleted = false;
  execution.completedAt = undefined;

  this.calculateScorecard();
  return true;
};

dailyExecutionSchema.methods.completeAction = function (
  actionId: Types.ObjectId
): boolean {
  const action = this.dailyActions.find(
    (a: IDailyAction) => a._id.toString() === actionId.toString()
  );

  if (!action) return false;

  action.isCompleted = true;
  action.completedAt = new Date();

  this.calculateScorecard();
  return true;
};

// Static methods
dailyExecutionSchema.statics.findByUserAndDate = function (
  userId: Types.ObjectId,
  date: Date
): Promise<IDailyExecutionDocument | null> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.findOne({
    userId,
    executionDate: { $gte: startOfDay, $lte: endOfDay },
  });
};

dailyExecutionSchema.statics.findByUserDateRange = function (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<IDailyExecutionDocument[]> {
  return this.find({
    userId,
    executionDate: { $gte: startDate, $lte: endDate },
  }).sort({ executionDate: 1 });
};

dailyExecutionSchema.statics.getOrCreateForToday = async function (
  userId: Types.ObjectId,
  planId: Types.ObjectId,
  habitIds: Types.ObjectId[]
): Promise<IDailyExecutionDocument> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let execution = await this.findByUserAndDate(userId, today);

  if (!execution) {
    execution = new this({
      userId,
      planId,
      executionDate: today,
      habitExecutions: habitIds.map((habitId) => ({
        habitId,
        isCompleted: false,
      })),
      dailyActions: [],
      scorecard: {
        habitsScore: 0,
        actionsScore: 0,
        overallScore: 0,
      },
    });
    await execution.save();
  }

  return execution;
};

export const DailyExecution = mongoose.model<
  IDailyExecutionDocument,
  IDailyExecutionModel
>('DailyExecution', dailyExecutionSchema);

