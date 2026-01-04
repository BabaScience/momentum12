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

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Plans', 'Habits', 'Executions', 'Analytics'],
  endpoints: (builder) => ({
    // Auth
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

    // User
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

    // Plans
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

    // Habits
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

    // Executions
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

    // Analytics
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
    getHeatmap: builder.query<ApiResponse<{ heatmap: any[] }>, number>({
      query: (days) => `/executions/heatmap?days=${days}`,
      providesTags: ['Executions'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useGetPlansQuery,
  useGetActivePlanQuery,
  useGetPlanQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useActivatePlanMutation,
  useGetHabitsQuery,
  useGetHabitsForTodayQuery,
  useGetHabitQuery,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useGetHabitStatisticsQuery,
  useGetTodayExecutionQuery,
  useCompleteHabitMutation,
  useUncompleteHabitMutation,
  useCompleteActionMutation,
  useAddReflectionMutation,
  useGetExecutionHistoryQuery,
  useGetDashboardQuery,
  useGetTrendsQuery,
  useGetWeeklyReportQuery,
  useGetHeatmapQuery,
} = apiSlice;

