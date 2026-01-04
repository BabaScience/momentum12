import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useGetDashboardQuery,
  useGetTrendsQuery,
  useGetCompletionHeatmapQuery,
  useGetHabitPerformanceQuery,
  useGetGoalProgressQuery,
  useGetActivePlanQuery,
} from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, getScoreColor } from '../../theme';
import type { HabitTrend } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TimeRangeSelector = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (range: string) => void;
}) => {
  const ranges = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: '12weeks', label: '12 Weeks' },
  ];

  return (
    <View style={styles.rangeSelector}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.value}
          style={[
            styles.rangeButton,
            selected === range.value && styles.rangeButtonSelected,
          ]}
          onPress={() => onSelect(range.value)}
        >
          <Text
            style={[
              styles.rangeButtonText,
              selected === range.value && styles.rangeButtonTextSelected,
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const MetricCard = ({
  value,
  label,
  color,
  subValue,
}: {
  value: string | number;
  label: string;
  color?: string;
  subValue?: string;
}) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
  </View>
);

const HabitPerformanceItem = ({
  habitName,
  completionRate,
  currentStreak,
  longestStreak,
  totalCompletions,
  trend,
}: {
  habitName: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  trend?: HabitTrend;
}) => {
  const trendIcon = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→';
  const trendColor =
    trend === 'improving'
      ? colors.success[500]
      : trend === 'declining'
      ? colors.danger[500]
      : colors.dark.textSecondary;

  return (
    <View style={styles.habitPerformanceItem}>
      <View style={styles.habitPerformanceInfo}>
        <View style={styles.habitPerformanceHeader}>
          <Text style={styles.habitPerformanceName}>{habitName}</Text>
          {trend && (
            <Text style={[styles.habitPerformanceTrend, { color: trendColor }]}>
              {trendIcon}
            </Text>
          )}
        </View>
        <View style={styles.habitPerformanceStats}>
          <Text style={[styles.habitPerformanceRate, { color: getScoreColor(completionRate) }]}>
            {completionRate}%
          </Text>
          <Text style={styles.habitPerformanceSeparator}>•</Text>
          <Text style={styles.habitPerformanceTotal}>{totalCompletions} total</Text>
        </View>
        {/* Progress bar */}
        <View style={styles.habitProgressBar}>
          <View
            style={[
              styles.habitProgressFill,
              { width: `${completionRate}%`, backgroundColor: getScoreColor(completionRate) },
            ]}
          />
        </View>
      </View>
      <View style={styles.habitStreakSection}>
        <View style={styles.habitStreakBadge}>
          <Text style={styles.habitStreakIcon}>🔥</Text>
          <Text style={styles.habitStreakValue}>{currentStreak}</Text>
        </View>
        <Text style={styles.habitBestStreak}>Best: {longestStreak}</Text>
      </View>
    </View>
  );
};

const HeatmapGrid = ({
  data,
}: {
  data: { date: string; completionRate: number; completedCount: number; totalCount: number }[];
}) => {
  const cellSize = (SCREEN_WIDTH - spacing[8] - spacing[3] * 6) / 7;

  // Group data by weeks
  const weeks: typeof data[] = [];
  let currentWeek: typeof data = [];

  data.forEach((day, index) => {
    currentWeek.push(day);
    if ((index + 1) % 7 === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <View style={styles.heatmapContainer}>
      {/* Day labels */}
      <View style={styles.heatmapDayLabels}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <View key={i} style={[styles.heatmapDayLabel, { width: cellSize }]}>
            <Text style={styles.heatmapDayLabelText}>{day}</Text>
          </View>
        ))}
      </View>

      {weeks.slice(-12).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.heatmapRow}>
          {week.map((day, dayIndex) => {
            const intensity = day.completionRate / 100;
            const backgroundColor =
              day.completionRate > 0
                ? `rgba(16, 185, 129, ${Math.max(0.15, intensity)})`
                : colors.dark.border;

            return (
              <View
                key={dayIndex}
                style={[
                  styles.heatmapCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor,
                  },
                ]}
              >
                {day.completedCount > 0 && (
                  <Text style={styles.heatmapCellText}>
                    {day.completedCount}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const GoalProgressSection = ({ planId }: { planId: string }) => {
  const { data: goalProgressData, isLoading } = useGetGoalProgressQuery(planId);
  const progress = goalProgressData?.data?.progress;

  if (isLoading) {
    return (
      <View style={styles.loadingSection}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  if (!progress || progress.strategicGoals.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Goal Progress</Text>
        <View style={styles.overallProgressBadge}>
          <Text style={styles.overallProgressText}>
            {progress.overallProgress}% Overall
          </Text>
        </View>
      </View>
      {progress.strategicGoals.map((goal) => (
        <View key={goal.id} style={styles.goalProgressItem}>
          <View style={styles.goalProgressHeader}>
            <Text style={styles.goalProgressTitle} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={styles.goalProgressStats}>
              {goal.weeklyGoalsCompleted}/{goal.weeklyGoalsTotal} goals
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View
              style={[
                styles.goalProgressFill,
                {
                  width: `${goal.progress}%`,
                  backgroundColor: getScoreColor(goal.progress),
                },
              ]}
            />
          </View>
          <Text style={styles.goalProgressPercent}>{goal.progress}%</Text>
        </View>
      ))}
    </View>
  );
};

export default function AnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useGetDashboardQuery();

  const { data: trendsData, refetch: refetchTrends } = useGetTrendsQuery(timeRange);

  // Use the new enhanced heatmap endpoint
  const { data: heatmapData, refetch: refetchHeatmap } = useGetCompletionHeatmapQuery({});

  // Use the new habit performance endpoint
  const { data: performanceData, refetch: refetchPerformance } = useGetHabitPerformanceQuery({
    range: timeRange === 'week' ? '7d' : timeRange === 'month' ? '30d' : '84d',
  });

  // Get active plan for goal progress
  const { data: planData } = useGetActivePlanQuery();
  const activePlan = planData?.data?.plan;

  const dashboard = dashboardData?.data?.dashboard;
  const trends = trendsData?.data?.trends;
  const heatmap = heatmapData?.data?.heatmap || [];
  const habitPerformance = performanceData?.data?.performance || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchDashboard(),
      refetchTrends(),
      refetchHeatmap(),
      refetchPerformance(),
    ]);
    setRefreshing(false);
  }, [refetchDashboard, refetchTrends, refetchHeatmap, refetchPerformance]);

  if (dashboardLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {/* Time Range Selector */}
        <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />

        {/* Key Metrics */}
        <View style={styles.metricsRow}>
          <MetricCard
            value={`${trends?.averageScore || 0}%`}
            label="Avg Score"
            color={getScoreColor(trends?.averageScore || 0)}
          />
          <MetricCard
            value={dashboard?.streakData?.currentStreak || 0}
            label="Current Streak"
            color={colors.warning[500]}
            subValue={`Best: ${dashboard?.streakData?.longestStreak || 0}`}
          />
          <MetricCard
            value={trends?.totalDaysTracked || 0}
            label="Days Tracked"
            color={colors.primary[500]}
          />
        </View>

        {/* Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Heatmap</Text>
          <View style={styles.heatmapCard}>
            {heatmap.length > 0 ? (
              <>
                <HeatmapGrid data={heatmap} />
                <View style={styles.heatmapLegend}>
                  <Text style={styles.heatmapLegendText}>Less</Text>
                  <View style={styles.heatmapLegendColors}>
                    {[0.15, 0.35, 0.55, 0.75, 0.95].map((opacity, index) => (
                      <View
                        key={index}
                        style={[
                          styles.heatmapLegendCell,
                          { backgroundColor: `rgba(16, 185, 129, ${opacity})` },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.heatmapLegendText}>More</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No activity data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Habit Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit Performance</Text>
          {habitPerformance.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No habit data yet</Text>
            </View>
          ) : (
            habitPerformance.map((habit) => (
              <HabitPerformanceItem
                key={habit.habitId}
                habitName={habit.habitName}
                completionRate={habit.completionRate}
                currentStreak={habit.currentStreak}
                longestStreak={habit.longestStreak}
                totalCompletions={habit.totalCompletions}
              />
            ))
          )}
        </View>

        {/* Goal Progress (if active plan exists) */}
        {activePlan && <GoalProgressSection planId={activePlan._id} />}

        {/* Dashboard Goal Progress (fallback) */}
        {!activePlan && dashboard?.goalProgress && dashboard.goalProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal Progress</Text>
            {dashboard.goalProgress.map((goal) => (
              <View key={goal.goalId} style={styles.goalProgressItem}>
                <View style={styles.goalProgressHeader}>
                  <Text style={styles.goalProgressTitle}>{goal.title}</Text>
                  <View
                    style={[
                      styles.trackBadge,
                      {
                        backgroundColor: goal.isOnTrack
                          ? colors.success[500] + '20'
                          : colors.danger[500] + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trackBadgeText,
                        { color: goal.isOnTrack ? colors.success[500] : colors.danger[500] },
                      ]}
                    >
                      {goal.isOnTrack ? 'On Track' : 'Behind'}
                    </Text>
                  </View>
                </View>
                <View style={styles.goalProgressBar}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      {
                        width: `${goal.progressPercentage}%`,
                        backgroundColor: goal.isOnTrack
                          ? colors.success[500]
                          : colors.danger[500],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.goalProgressPercent}>{goal.progressPercentage}%</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSection: {
    padding: spacing[6],
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[24],
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    marginBottom: spacing[6],
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  rangeButtonSelected: {
    backgroundColor: colors.primary[500],
  },
  rangeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSecondary,
  },
  rangeButtonTextSelected: {
    color: colors.white,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  metricSubValue: {
    fontSize: fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: spacing[1],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[3],
  },
  overallProgressBadge: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  overallProgressText: {
    fontSize: fontSize.xs,
    color: colors.primary[400],
    fontWeight: fontWeight.medium,
  },
  heatmapCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  heatmapContainer: {
    gap: spacing[1],
  },
  heatmapDayLabels: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  heatmapDayLabel: {
    alignItems: 'center',
  },
  heatmapDayLabelText: {
    fontSize: fontSize.xs,
    color: colors.dark.textMuted,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  heatmapCell: {
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatmapCellText: {
    fontSize: 8,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  heatmapLegendText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  heatmapLegendColors: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  habitPerformanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  habitPerformanceInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  habitPerformanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitPerformanceName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
    flex: 1,
  },
  habitPerformanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    gap: spacing[2],
  },
  habitPerformanceRate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  habitPerformanceSeparator: {
    color: colors.dark.textMuted,
  },
  habitPerformanceTotal: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
  },
  habitPerformanceTrend: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  habitProgressBar: {
    height: 4,
    backgroundColor: colors.dark.border,
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
    overflow: 'hidden',
  },
  habitProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  habitStreakSection: {
    alignItems: 'center',
  },
  habitStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  habitStreakIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing[1],
  },
  habitStreakValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning[500],
  },
  habitBestStreak: {
    fontSize: fontSize.xs,
    color: colors.dark.textMuted,
    marginTop: spacing[1],
  },
  emptySection: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  emptySectionText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
  },
  goalProgressItem: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  goalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  goalProgressTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
    flex: 1,
    marginRight: spacing[2],
  },
  goalProgressStats: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  trackBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  trackBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: colors.dark.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing[1],
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  goalProgressPercent: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    textAlign: 'right',
  },
});
