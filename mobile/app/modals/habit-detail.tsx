import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useGetHabitQuery,
  useGetHabitStatisticsQuery,
  useGetHabitHistoryQuery,
  useDeleteHabitMutation,
  useArchiveHabitMutation,
} from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, getScoreColor } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_CELL_SIZE = (SCREEN_WIDTH - spacing[8] - spacing[2] * 6) / 7;

// Calendar component for habit history
const HabitCalendar = ({ history }: { history: { date: string; completed: boolean; timeSpent?: number; notes?: string }[] }) => {
  // Group by weeks for display
  const today = new Date();
  const historyMap = new Map(history.map(h => [h.date.split('T')[0], h]));
  
  // Generate last 28 days
  const days: { date: Date; entry?: { completed: boolean; timeSpent?: number } }[] = [];
  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date,
      entry: historyMap.get(dateStr),
    });
  }

  // Split into weeks
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.calendarContainer}>
      {/* Day labels */}
      <View style={styles.calendarDayLabels}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <Text key={i} style={styles.calendarDayLabel}>{day}</Text>
        ))}
      </View>
      
      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.calendarWeek}>
          {week.map((day, dayIndex) => {
            const isToday = day.date.toDateString() === today.toDateString();
            const isCompleted = day.entry?.completed;
            const isFuture = day.date > today;
            
            return (
              <View
                key={dayIndex}
                style={[
                  styles.calendarCell,
                  isCompleted && styles.calendarCellCompleted,
                  isToday && styles.calendarCellToday,
                  isFuture && styles.calendarCellFuture,
                ]}
              >
                <Text
                  style={[
                    styles.calendarCellText,
                    isCompleted && styles.calendarCellTextCompleted,
                    isFuture && styles.calendarCellTextFuture,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      
      {/* Legend */}
      <View style={styles.calendarLegend}>
        <View style={styles.calendarLegendItem}>
          <View style={[styles.calendarLegendDot, { backgroundColor: colors.success[500] }]} />
          <Text style={styles.calendarLegendText}>Completed</Text>
        </View>
        <View style={styles.calendarLegendItem}>
          <View style={[styles.calendarLegendDot, { backgroundColor: colors.dark.border }]} />
          <Text style={styles.calendarLegendText}>Missed</Text>
        </View>
      </View>
    </View>
  );
};

export default function HabitDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const { data: habitData, isLoading } = useGetHabitQuery(id || '');
  const { data: statsData } = useGetHabitStatisticsQuery(id || '');
  const { data: historyData } = useGetHabitHistoryQuery({ habitId: id || '', days: 30 }, { skip: !id });
  const [deleteHabit, { isLoading: isDeleting }] = useDeleteHabitMutation();
  const [archiveHabit, { isLoading: isArchiving }] = useArchiveHabitMutation();

  const habit = habitData?.data?.habit;
  const statistics = statsData?.data?.statistics;
  const history = historyData?.data?.history || [];

  const handleArchive = () => {
    Alert.alert(
      'Archive Habit',
      'Archived habits will be hidden from your daily list but statistics will be preserved. You can restore it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await archiveHabit(id || '').unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to archive habit');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit? This action cannot be undone and all history will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(id || '').unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !habit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  // Calculate completion stats from history
  const completedDays = history.filter(h => h.completed).length;
  const totalDays = history.length;
  const recentCompletionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Habit Options',
              '',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Edit', onPress: () => {} },
                { text: 'Archive', onPress: handleArchive },
                { text: 'Delete', style: 'destructive', onPress: handleDelete },
              ]
            );
          }}
        >
          <Text style={styles.menuButton}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Habit Header */}
        <View style={styles.habitHeader}>
          <View style={[styles.habitIcon, { backgroundColor: habit.appearance.colorHex + '20' }]}>
            <View style={[styles.habitIconDot, { backgroundColor: habit.appearance.colorHex }]} />
          </View>
          <Text style={styles.habitName}>{habit.name}</Text>
          {habit.description && (
            <Text style={styles.habitDescription}>{habit.description}</Text>
          )}
          {habit.isArchived && (
            <View style={styles.archivedBadge}>
              <Text style={styles.archivedBadgeText}>Archived</Text>
            </View>
          )}
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakValue}>{habit.streakData.currentStreak}</Text>
            <Text style={styles.streakLabel}>Current</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🏆</Text>
            <Text style={styles.streakValue}>{habit.streakData.longestStreak}</Text>
            <Text style={styles.streakLabel}>Best</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Text style={styles.streakIcon}>🎯</Text>
            <Text style={styles.streakValue}>{habit.streakData.targetStreak}</Text>
            <Text style={styles.streakLabel}>Target</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: getScoreColor(statistics?.completionRate || 0) }]}>
                {statistics?.completionRate || 0}%
              </Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: getScoreColor(recentCompletionRate) }]}>
                {recentCompletionRate}%
              </Text>
              <Text style={styles.statLabel}>Last 30 Days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics?.totalCompletions || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Completion History Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completion History</Text>
            <TouchableOpacity onPress={() => setShowFullHistory(!showFullHistory)}>
              <Text style={styles.sectionAction}>
                {showFullHistory ? 'Show Less' : 'Show More'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.historyCard}>
            <HabitCalendar history={history} />
          </View>
        </View>

        {/* Weekly Overview (from stats) */}
        {statistics?.weeklyCompletions && statistics.weeklyCompletions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last 7 Days</Text>
            <View style={styles.weekOverview}>
              {statistics.weeklyCompletions.map((day: { date: string; completed: boolean }, index: number) => (
                <View key={index} style={styles.dayItem}>
                  <View
                    style={[
                      styles.dayDot,
                      day.completed
                        ? { backgroundColor: colors.success[500] }
                        : { backgroundColor: colors.dark.border },
                    ]}
                  />
                  <Text style={styles.dayLabel}>
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Frequency</Text>
              <Text style={styles.settingValue}>
                {habit.frequency.type === 'daily'
                  ? 'Every day'
                  : habit.frequency.type === 'weekly'
                  ? `${habit.frequency.timesPerWeek}x per week`
                  : 'Custom'}
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Reminders</Text>
              <Text style={styles.settingValue}>
                {habit.reminders.enabled
                  ? habit.reminders.times.join(', ')
                  : 'Off'}
              </Text>
            </View>
            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.settingLabel}>Created</Text>
              <Text style={styles.settingValue}>
                {new Date(habit.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={handleArchive}
            disabled={isArchiving}
          >
            {isArchiving ? (
              <ActivityIndicator size="small" color={colors.warning[500]} />
            ) : (
              <Text style={styles.archiveButtonText}>Archive Habit</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger[500]} />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Habit</Text>
            )}
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backButton: {
    fontSize: fontSize.base,
    color: colors.primary[400],
  },
  menuButton: {
    fontSize: fontSize['2xl'],
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing[2],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[24],
  },
  habitHeader: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  habitIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  habitIconDot: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
  },
  habitName: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    textAlign: 'center',
  },
  habitDescription: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  archivedBadge: {
    marginTop: spacing[2],
    backgroundColor: colors.warning[500] + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  archivedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.warning[500],
    fontWeight: fontWeight.medium,
  },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: fontSize.xl,
    marginBottom: spacing[1],
  },
  streakValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  streakLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  streakDivider: {
    width: 1,
    backgroundColor: colors.dark.border,
    marginHorizontal: spacing[2],
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
  sectionAction: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  calendarContainer: {
    // Calendar styling
  },
  calendarDayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[2],
  },
  calendarDayLabel: {
    width: CALENDAR_CELL_SIZE,
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.dark.textMuted,
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[1],
  },
  calendarCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCellCompleted: {
    backgroundColor: colors.success[500],
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  calendarCellFuture: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  calendarCellText: {
    fontSize: fontSize.xs,
    color: colors.dark.text,
    fontWeight: fontWeight.medium,
  },
  calendarCellTextCompleted: {
    color: colors.white,
  },
  calendarCellTextFuture: {
    color: colors.dark.textMuted,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    marginTop: spacing[3],
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  calendarLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarLegendText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  weekOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  dayItem: {
    alignItems: 'center',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    marginBottom: spacing[2],
  },
  dayLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  settingsCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  settingLabel: {
    fontSize: fontSize.base,
    color: colors.dark.text,
  },
  settingValue: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
  },
  actionButtons: {
    gap: spacing[3],
  },
  archiveButton: {
    backgroundColor: colors.warning[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning[500] + '40',
  },
  archiveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.warning[500],
  },
  deleteButton: {
    backgroundColor: colors.danger[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger[500] + '40',
  },
  deleteButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.danger[500],
  },
});
