import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetHabitQuery, useGetHabitStatisticsQuery, useDeleteHabitMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, getScoreColor } from '../../theme';

export default function HabitDetailModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: habitData, isLoading } = useGetHabitQuery(id || '');
  const { data: statsData } = useGetHabitStatisticsQuery(id || '');
  const [deleteHabit, { isLoading: isDeleting }] = useDeleteHabitMutation();

  const habit = habitData?.data?.habit;
  const statistics = statsData?.data?.statistics;

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(id || '').unwrap();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.editButton}>Edit</Text>
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
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics?.totalCompletions || 0}</Text>
              <Text style={styles.statLabel}>Total Completions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics?.averageTimeSpent || 0}</Text>
              <Text style={styles.statLabel}>Avg. Minutes</Text>
            </View>
          </View>
        </View>

        {/* Weekly Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <View style={styles.weekOverview}>
            {statistics?.weeklyCompletions?.map((day: { date: string; completed: boolean }, index: number) => (
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
          </View>
        </View>

        {/* Delete Button */}
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
  editButton: {
    fontSize: fontSize.base,
    color: colors.primary[500],
    fontWeight: fontWeight.medium,
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[3],
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

