import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { secureStorage } from '../services/storage';
import type { 
  ApiResponse, 
  User, 
  Habit, 
  TwelveWeekPlan, 
  DailyExecution,
  DashboardData,
  LoginResponse,
  RegisterResponse,
  CreateStrategicGoalInput,
  CreateWeeklyGoalInput,
} from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers) => {
    const token = await secureStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh token
    const refreshToken = await secureStorage.getRefreshToken();
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const data = (refreshResult.data as any).data;
        await secureStorage.setTokens(data.accessToken, data.refreshToken);
        // Retry original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        await secureStorage.clearTokens();
      }
    }
  }

  return result;
};

// Types for new endpoints
interface StrategicGoal {
  id?: string;
  title: string;
  description?: string;
  category: 'health' | 'career' | 'relationships' | 'personal' | 'financial' | 'other';
  targetMetric?: {
    name: string;
    target: number;
    unit: string;
  };
}

interface WeeklyGoal {
  id?: string;
  weekNumber: number;
  title: string;
  strategicGoalId?: string;
  isCompleted?: boolean;
}

interface HabitHistoryEntry {
  date: string;
  completed: boolean;
  timeSpent?: number;
  notes?: string;
}

interface CompletionHeatmapData {
  date: string;
  completionRate: number;
  completedCount: number;
  totalCount: number;
}

interface HabitPerformanceData {
  habitId: string;
  habitName: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}

interface GoalProgressData {
  strategicGoals: {
    id: string;
    title: string;
    progress: number;
    weeklyGoalsCompleted: number;
    weeklyGoalsTotal: number;
  }[];
  overallProgress: number;
}

interface UserStatistics {
  totalHabitsCompleted: number;
  totalPlansCreated: number;
  totalReflections: number;
  currentStreak: number;
  longestStreak: number;
  averageCompletionRate: number;
  memberSince: string;
}

interface PlanProgress {
  currentWeek: number;
  totalWeeks: number;
  weeklyProgress: {
    weekNumber: number;
    completionRate: number;
    goalsCompleted: number;
    goalsTotal: number;
  }[];
  strategicGoalProgress: {
    goalId: string;
    title: string;
    progress: number;
  }[];
  overallCompletionRate: number;
}

interface DailyAction {
  title: string;
  description?: string;
  habitId?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedMinutes?: number;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Plans', 'Habits', 'Executions', 'Analytics'],
  endpoints: (builder) => ({
    // ==================== AUTH ====================
    login: builder.mutation<ApiResponse<LoginResponse>, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<ApiResponse<RegisterResponse>, { email: string; password: string; displayName: string }>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<ApiResponse, { refreshToken?: string }>({
      query: (data) => ({
        url: '/auth/logout',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Plans', 'Habits', 'Executions', 'Analytics'],
    }),
    // NEW: Forgot password
    forgotPassword: builder.mutation<ApiResponse<{ message: string }>, { email: string }>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    // NEW: Change password
    changePassword: builder.mutation<ApiResponse<{ message: string }>, { currentPassword: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    // NEW: Delete account
    deleteAccount: builder.mutation<ApiResponse<{ message: string }>, { password: string }>({
      query: (data) => ({
        url: '/auth/account',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: ['User', 'Plans', 'Habits', 'Executions', 'Analytics'],
    }),
    // NEW: Get current user
    getCurrentUser: builder.query<ApiResponse<{ user: User }>, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // ==================== USER ====================
    getProfile: builder.query<ApiResponse<{ user: User }>, void>({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<ApiResponse<{ user: User }>, Partial<User>>({
      query: (data) => ({
        url: '/users/profile',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updatePreferences: builder.mutation<ApiResponse<{ user: User }>, any>({
      query: (data) => ({
        url: '/users/preferences',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    // NEW: Get user statistics
    getUserStatistics: builder.query<ApiResponse<{ statistics: UserStatistics }>, void>({
      query: () => '/users/statistics',
      providesTags: ['User', 'Analytics'],
    }),

    // ==================== PLANS ====================
    getPlans: builder.query<ApiResponse<{ plans: TwelveWeekPlan[] }>, void>({
      query: () => '/plans',
      providesTags: ['Plans'],
    }),
    getActivePlan: builder.query<ApiResponse<{ plan: TwelveWeekPlan | null }>, void>({
      query: () => '/plans/active',
      providesTags: ['Plans'],
    }),
    getPlan: builder.query<ApiResponse<{ plan: TwelveWeekPlan }>, string>({
      query: (id) => `/plans/${id}`,
      providesTags: ['Plans'],
    }),
    createPlan: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, any>({
      query: (data) => ({
        url: '/plans',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Plans'],
    }),
    updatePlan: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/plans/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Plans'],
    }),
    activatePlan: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, string>({
      query: (id) => ({
        url: `/plans/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Delete plan
    deletePlan: builder.mutation<ApiResponse<{ message: string }>, string>({
      query: (id) => ({
        url: `/plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Get plan progress
    getPlanProgress: builder.query<ApiResponse<{ progress: PlanProgress }>, string>({
      query: (planId) => `/plans/${planId}/progress`,
      providesTags: ['Plans', 'Analytics'],
    }),
    // NEW: Add strategic goal
    addStrategicGoal: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { planId: string; goal: CreateStrategicGoalInput }>({
      query: ({ planId, goal }) => ({
        url: `/plans/${planId}/strategic-goals`,
        method: 'POST',
        body: goal,
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Update strategic goal
    updateStrategicGoal: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { planId: string; goalId: string; data: Partial<StrategicGoal> }>({
      query: ({ planId, goalId, data }) => ({
        url: `/plans/${planId}/strategic-goals/${goalId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Delete strategic goal
    deleteStrategicGoal: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { planId: string; goalId: string }>({
      query: ({ planId, goalId }) => ({
        url: `/plans/${planId}/strategic-goals/${goalId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Add weekly goal
    addWeeklyGoal: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { planId: string; goal: CreateWeeklyGoalInput }>({
      query: ({ planId, goal }) => ({
        url: `/plans/${planId}/weekly-goals`,
        method: 'POST',
        body: goal,
      }),
      invalidatesTags: ['Plans'],
    }),
    // NEW: Update weekly goal
    updateWeeklyGoal: builder.mutation<ApiResponse<{ plan: TwelveWeekPlan }>, { planId: string; goalId: string; data: Partial<WeeklyGoal> }>({
      query: ({ planId, goalId, data }) => ({
        url: `/plans/${planId}/weekly-goals/${goalId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Plans'],
    }),

    // ==================== HABITS ====================
    getHabits: builder.query<ApiResponse<{ habits: Habit[] }>, void>({
      query: () => '/habits',
      providesTags: ['Habits'],
    }),
    getHabitsForToday: builder.query<ApiResponse<{ habits: Habit[] }>, void>({
      query: () => '/habits/today',
      providesTags: ['Habits'],
    }),
    getHabit: builder.query<ApiResponse<{ habit: Habit }>, string>({
      query: (id) => `/habits/${id}`,
      providesTags: ['Habits'],
    }),
    createHabit: builder.mutation<ApiResponse<{ habit: Habit }>, any>({
      query: (data) => ({
        url: '/habits',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Habits', 'Executions'],
    }),
    updateHabit: builder.mutation<ApiResponse<{ habit: Habit }>, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/habits/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Habits'],
    }),
    deleteHabit: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/habits/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Habits', 'Executions'],
    }),
    getHabitStatistics: builder.query<ApiResponse<{ statistics: any }>, string>({
      query: (id) => `/habits/${id}/statistics`,
      providesTags: ['Habits'],
    }),
    // NEW: Archive habit
    archiveHabit: builder.mutation<ApiResponse<{ habit: Habit }>, string>({
      query: (habitId) => ({
        url: `/habits/${habitId}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['Habits'],
    }),
    // NEW: Get habit history
    getHabitHistory: builder.query<ApiResponse<{ history: HabitHistoryEntry[] }>, { habitId: string; days?: number }>({
      query: ({ habitId, days = 30 }) => `/habits/${habitId}/history?days=${days}`,
      providesTags: ['Habits', 'Executions'],
    }),

    // ==================== EXECUTIONS ====================
    getTodayExecution: builder.query<ApiResponse<{ execution: DailyExecution }>, void>({
      query: () => '/executions/today',
      providesTags: ['Executions'],
    }),
    completeHabit: builder.mutation<ApiResponse<{ execution: DailyExecution }>, { executionId: string; habitId: string; timeSpent?: number; notes?: string }>({
      query: ({ executionId, habitId, ...body }) => ({
        url: `/executions/${executionId}/habits/${habitId}/complete`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Executions', 'Habits', 'Analytics'],
    }),
    uncompleteHabit: builder.mutation<ApiResponse<{ execution: DailyExecution }>, { executionId: string; habitId: string }>({
      query: ({ executionId, habitId }) => ({
        url: `/executions/${executionId}/habits/${habitId}/uncomplete`,
        method: 'POST',
      }),
      invalidatesTags: ['Executions', 'Habits', 'Analytics'],
    }),
    completeAction: builder.mutation<ApiResponse<{ execution: DailyExecution }>, { executionId: string; actionId: string }>({
      query: ({ executionId, actionId }) => ({
        url: `/executions/${executionId}/actions/${actionId}/complete`,
        method: 'POST',
      }),
      invalidatesTags: ['Executions', 'Analytics'],
    }),
    addReflection: builder.mutation<ApiResponse<{ execution: DailyExecution }>, { executionId: string; reflection: any }>({
      query: ({ executionId, reflection }) => ({
        url: `/executions/${executionId}/reflection`,
        method: 'POST',
        body: reflection,
      }),
      invalidatesTags: ['Executions'],
    }),
    getExecutionHistory: builder.query<ApiResponse<{ executions: DailyExecution[] }>, number>({
      query: (days) => `/executions/history?days=${days}`,
      providesTags: ['Executions'],
    }),
    // NEW: Get execution by date
    getExecutionByDate: builder.query<ApiResponse<{ execution: DailyExecution }>, string>({
      query: (date) => `/executions/date/${date}`,
      providesTags: ['Executions'],
    }),
    // NEW: Add action to execution
    addAction: builder.mutation<ApiResponse<{ execution: DailyExecution }>, { executionId: string; action: DailyAction }>({
      query: ({ executionId, action }) => ({
        url: `/executions/${executionId}/actions`,
        method: 'POST',
        body: action,
      }),
      invalidatesTags: ['Executions'],
    }),
    getHeatmap: builder.query<ApiResponse<{ heatmap: any[] }>, number>({
      query: (days) => `/executions/heatmap?days=${days}`,
      providesTags: ['Executions'],
    }),

    // ==================== ANALYTICS ====================
    getDashboard: builder.query<ApiResponse<{ dashboard: DashboardData }>, void>({
      query: () => '/analytics/dashboard',
      providesTags: ['Analytics'],
    }),
    getTrends: builder.query<ApiResponse<{ trends: any }>, string>({
      query: (range) => `/analytics/trends?range=${range}`,
      providesTags: ['Analytics'],
    }),
    getWeeklyReport: builder.query<ApiResponse<{ report: any }>, number>({
      query: (weekNumber) => `/analytics/weekly-report/${weekNumber}`,
      providesTags: ['Analytics'],
    }),
    // NEW: Get completion heatmap
    getCompletionHeatmap: builder.query<ApiResponse<{ heatmap: CompletionHeatmapData[] }>, { startDate?: string; endDate?: string }>({
      query: ({ startDate, endDate } = {}) => {
        let url = '/analytics/completion-heatmap';
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (params.toString()) url += `?${params.toString()}`;
        return url;
      },
      providesTags: ['Analytics', 'Executions'],
    }),
    // NEW: Get habit performance
    getHabitPerformance: builder.query<ApiResponse<{ performance: HabitPerformanceData[] }>, { range?: string }>({
      query: ({ range = '30d' } = {}) => `/analytics/habit-performance?range=${range}`,
      providesTags: ['Analytics', 'Habits'],
    }),
    // NEW: Get goal progress for a plan
    getGoalProgress: builder.query<ApiResponse<{ progress: GoalProgressData }>, string>({
      query: (planId) => `/analytics/goal-progress/${planId}`,
      providesTags: ['Analytics', 'Plans'],
    }),
  }),
});

export const {
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useGetCurrentUserQuery,
  // User
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useGetUserStatisticsQuery,
  // Plans
  useGetPlansQuery,
  useGetActivePlanQuery,
  useGetPlanQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useActivatePlanMutation,
  useDeletePlanMutation,
  useGetPlanProgressQuery,
  useAddStrategicGoalMutation,
  useUpdateStrategicGoalMutation,
  useDeleteStrategicGoalMutation,
  useAddWeeklyGoalMutation,
  useUpdateWeeklyGoalMutation,
  // Habits
  useGetHabitsQuery,
  useGetHabitsForTodayQuery,
  useGetHabitQuery,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useGetHabitStatisticsQuery,
  useArchiveHabitMutation,
  useGetHabitHistoryQuery,
  // Executions
  useGetTodayExecutionQuery,
  useCompleteHabitMutation,
  useUncompleteHabitMutation,
  useCompleteActionMutation,
  useAddReflectionMutation,
  useGetExecutionHistoryQuery,
  useGetExecutionByDateQuery,
  useAddActionMutation,
  useGetHeatmapQuery,
  // Analytics
  useGetDashboardQuery,
  useGetTrendsQuery,
  useGetWeeklyReportQuery,
  useGetCompletionHeatmapQuery,
  useGetHabitPerformanceQuery,
  useGetGoalProgressQuery,
} = apiSlice;
