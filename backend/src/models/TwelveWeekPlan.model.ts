import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  PlanStatus,
  GoalCategory,
  IStrategicGoal,
  IWeeklyGoal,
  IExecutionMetrics,
} from '../types/index.js';

export interface ITwelveWeekPlanDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  visionStatement: string;
  startDate: Date;
  endDate: Date;
  status: PlanStatus;
  currentWeek: number;
  strategicGoals: IStrategicGoal[];
  weeklyGoals: IWeeklyGoal[];
  executionMetrics: IExecutionMetrics;
  createdAt: Date;
  updatedAt: Date;
}

interface ITwelveWeekPlanModel extends Model<ITwelveWeekPlanDocument> {
  findActivePlanByUser(userId: Types.ObjectId): Promise<ITwelveWeekPlanDocument | null>;
  findPlansByUser(userId: Types.ObjectId): Promise<ITwelveWeekPlanDocument[]>;
}

const strategicGoalSchema = new Schema<IStrategicGoal>(
  {
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      minlength: [3, 'Goal title must be at least 3 characters'],
      maxlength: [100, 'Goal title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Goal description is required'],
      trim: true,
      maxlength: [1000, 'Goal description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: Object.values(GoalCategory),
      required: [true, 'Goal category is required'],
    },
    priority: {
      type: Number,
      required: true,
      min: [1, 'Priority must be at least 1'],
      max: [5, 'Priority cannot exceed 5'],
    },
    measurement: {
      targetValue: {
        type: Number,
        required: [true, 'Target value is required'],
        min: [0, 'Target value cannot be negative'],
      },
      currentValue: {
        type: Number,
        default: 0,
        min: [0, 'Current value cannot be negative'],
      },
      unit: {
        type: String,
        required: [true, 'Measurement unit is required'],
        trim: true,
        maxlength: [50, 'Unit cannot exceed 50 characters'],
      },
    },
    isAchieved: {
      type: Boolean,
      default: false,
    },
    achievedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const weeklyGoalSchema = new Schema<IWeeklyGoal>(
  {
    strategicGoalId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Strategic goal reference is required'],
    },
    weekNumber: {
      type: Number,
      required: [true, 'Week number is required'],
      min: [1, 'Week number must be at least 1'],
      max: [12, 'Week number cannot exceed 12'],
    },
    description: {
      type: String,
      required: [true, 'Weekly goal description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
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

const executionMetricsSchema = new Schema<IExecutionMetrics>(
  {
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    weeklyScores: {
      type: [Number],
      default: [],
    },
    habitCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    goalCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const twelveWeekPlanSchema = new Schema<ITwelveWeekPlanDocument, ITwelveWeekPlanModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      minlength: [3, 'Plan title must be at least 3 characters'],
      maxlength: [100, 'Plan title cannot exceed 100 characters'],
    },
    visionStatement: {
      type: String,
      required: [true, 'Vision statement is required'],
      trim: true,
      minlength: [20, 'Vision statement must be at least 20 characters'],
      maxlength: [1000, 'Vision statement cannot exceed 1000 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    status: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.DRAFT,
    },
    currentWeek: {
      type: Number,
      default: 1,
      min: 0,
      max: 12,
    },
    strategicGoals: {
      type: [strategicGoalSchema],
      default: [],
      validate: {
        validator: function (goals: IStrategicGoal[]) {
          return goals.length <= 5;
        },
        message: 'Cannot have more than 5 strategic goals',
      },
    },
    weeklyGoals: {
      type: [weeklyGoalSchema],
      default: [],
    },
    executionMetrics: {
      type: executionMetricsSchema,
      default: () => ({
        overallScore: 0,
        weeklyScores: [],
        habitCompletionRate: 0,
        goalCompletionRate: 0,
      }),
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
twelveWeekPlanSchema.index({ userId: 1, status: 1 });
twelveWeekPlanSchema.index({ userId: 1, startDate: -1 });
twelveWeekPlanSchema.index({ status: 1, currentWeek: 1 });
twelveWeekPlanSchema.index({ 'strategicGoals._id': 1 });

// Pre-save middleware to calculate end date
twelveWeekPlanSchema.pre('save', function (next) {
  if (this.isModified('startDate') && !this.endDate) {
    // Add 12 weeks (84 days) to start date
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + 84);
    this.endDate = endDate;
  }
  next();
});

// Static methods
twelveWeekPlanSchema.statics.findActivePlanByUser = function (
  userId: Types.ObjectId
): Promise<ITwelveWeekPlanDocument | null> {
  return this.findOne({ userId, status: PlanStatus.ACTIVE });
};

twelveWeekPlanSchema.statics.findPlansByUser = function (
  userId: Types.ObjectId
): Promise<ITwelveWeekPlanDocument[]> {
  return this.find({ userId }).sort({ startDate: -1 });
};

export const TwelveWeekPlan = mongoose.model<ITwelveWeekPlanDocument, ITwelveWeekPlanModel>(
  'TwelveWeekPlan',
  twelveWeekPlanSchema
);

