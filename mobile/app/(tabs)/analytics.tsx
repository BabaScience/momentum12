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
import { useGetDashboardQuery, useGetTrendsQuery, useGetHeatmapQuery } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, getScoreColor } from '../../theme';
import type { DashboardData, HabitTrend } from '../../types';

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
}: {
  value: string | number;
  label: string;
  color?: string;
}) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, color && { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const HabitPerformanceItem = ({
  habitName,
  completionRate,
  currentStreak,
  trend,
}: {
  habitName: string;
  completionRate: number;
  currentStreak: number;
  trend: HabitTrend;
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
        <Text style={styles.habitPerformanceName}>{habitName}</Text>
        <View style={styles.habitPerformanceStats}>
          <Text style={styles.habitPerformanceRate}>{completionRate}%</Text>
          <Text style={[styles.habitPerformanceTrend, { color: trendColor }]}>
            {trendIcon}
          </Text>
        </View>
      </View>
      <View style={styles.habitStreakBadge}>
        <Text style={styles.habitStreakIcon}>🔥</Text>
        <Text style={styles.habitStreakValue}>{currentStreak}</Text>
      </View>
    </View>
  );
};

const HeatmapGrid = ({ data }: { data: { date: string; score: number; completed: boolean }[] }) => {
  const cellSize = (SCREEN_WIDTH - spacing[8] - spacing[3] * 6) / 7;

  // Group data by weeks
  const weeks: { date: string; score: number; completed: boolean }[][] = [];
  let currentWeek: { date: string; score: number; completed: boolean }[] = [];

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
      {weeks.slice(-12).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.heatmapRow}>
          {week.map((day, dayIndex) => {
            const intensity = day.score / 100;
            const backgroundColor = day.score > 0
              ? `rgba(16, 185, 129, ${Math.max(0.1, intensity)})`
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
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default function AnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('month');

  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useGetDashboardQuery();
  const { data: trendsData, refetch: refetchTrends } = useGetTrendsQuery(timeRange);
  const { data: heatmapData, refetch: refetchHeatmap } = useGetHeatmapQuery(90);

  const dashboard = dashboardData?.data?.dashboard;
  const trends = trendsData?.data?.trends;
  const heatmap = heatmapData?.data?.heatmap || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchTrends(), refetchHeatmap()]);
    setRefreshing(false);
  }, [refetchDashboard, refetchTrends, refetchHeatmap]);

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
            <HeatmapGrid data={heatmap} />
            <View style={styles.heatmapLegend}>
              <Text style={styles.heatmapLegendText}>Less</Text>
              <View style={styles.heatmapLegendColors}>
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((opacity, index) => (
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
          </View>
        </View>

        {/* Habit Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit Performance</Text>
          {dashboard?.habitPerformance?.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptySectionText}>No habit data yet</Text>
            </View>
          ) : (
            dashboard?.habitPerformance?.map((habit) => (
              <HabitPerformanceItem
                key={habit.habitId}
                habitName={habit.habitName}
                completionRate={habit.completionRate}
                currentStreak={habit.currentStreak}
                trend={habit.trend}
              />
            ))
          )}
        </View>

        {/* Goal Progress */}
        {dashboard?.goalProgress && dashboard.goalProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal Progress</Text>
            {dashboard.goalProgress.map((goal) => (
              <View key={goal.goalId} style={styles.goalProgressItem}>
                <View style={styles.goalProgressHeader}>
                  <Text style={styles.goalProgressTitle}>{goal.title}</Text>
                  <View
                    style={[
                      styles.trackBadge,
                      { backgroundColor: goal.isOnTrack ? colors.success[500] + '20' : colors.danger[500] + '20' },
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
                        backgroundColor: goal.isOnTrack ? colors.success[500] : colors.danger[500],
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
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[3],
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
  heatmapRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  heatmapCell: {
    borderRadius: borderRadius.sm,
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
  },
  habitPerformanceName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
  },
  habitPerformanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    gap: spacing[2],
  },
  habitPerformanceRate: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
  },
  habitPerformanceTrend: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
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

