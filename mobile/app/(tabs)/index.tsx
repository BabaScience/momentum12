import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import {
  useGetTodayExecutionQuery,
  useCompleteHabitMutation,
  useUncompleteHabitMutation,
  useGetActivePlanQuery,
} from '../../store/api';
import { useAppSelector } from '../../store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, getScoreColor } from '../../theme';
import type { HabitExecution } from '../../types';

// Habit Card Component
const HabitCard = ({
  habitExecution,
  habitName,
  colorHex,
  currentStreak,
  executionId,
  onComplete,
  onUncomplete,
}: {
  habitExecution: HabitExecution;
  habitName: string;
  colorHex: string;
  currentStreak: number;
  executionId: string;
  onComplete: () => void;
  onUncomplete: () => void;
}) => {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(habitExecution.isCompleted ? 1 : 0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePress = async () => {
    if (habitExecution.isCompleted) {
      checkScale.value = withSpring(0);
      onUncomplete();
    } else {
      scale.value = withSequence(
        withSpring(1.05, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
      checkScale.value = withSpring(1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onComplete();
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
      <Animated.View style={[styles.habitCard, cardStyle]}>
        <View style={styles.habitContent}>
          <View style={[styles.habitIcon, { backgroundColor: colorHex + '20' }]}>
            <View style={[styles.habitIconDot, { backgroundColor: colorHex }]} />
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitName}>{habitName}</Text>
            {currentStreak > 0 && (
              <Text style={styles.streakText}>🔥 {currentStreak} day streak</Text>
            )}
          </View>
        </View>
        <View
          style={[
            styles.checkbox,
            habitExecution.isCompleted && { backgroundColor: colors.success[500], borderColor: colors.success[500] },
          ]}
        >
          <Animated.View style={[styles.checkmark, checkStyle]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Score Card Component
const ScoreCard = ({ score, label }: { score: number; label: string }) => {
  const scoreColor = getScoreColor(score);

  return (
    <View style={styles.scoreCard}>
      <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}%</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
};

export default function TodayScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: executionData,
    isLoading: executionLoading,
    refetch: refetchExecution,
  } = useGetTodayExecutionQuery();

  const { data: planData } = useGetActivePlanQuery();
  
  const [completeHabit] = useCompleteHabitMutation();
  const [uncompleteHabit] = useUncompleteHabitMutation();

  const execution = executionData?.data?.execution;
  const plan = planData?.data?.plan;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchExecution();
    setRefreshing(false);
  }, [refetchExecution]);

  const handleCompleteHabit = async (habitId: string) => {
    if (!execution) return;
    try {
      await completeHabit({
        executionId: execution._id,
        habitId,
      }).unwrap();
    } catch (error) {
      console.error('Failed to complete habit:', error);
    }
  };

  const handleUncompleteHabit = async (habitId: string) => {
    if (!execution) return;
    try {
      await uncompleteHabit({
        executionId: execution._id,
        habitId,
      }).unwrap();
    } catch (error) {
      console.error('Failed to uncomplete habit:', error);
    }
  };

  const today = format(new Date(), 'EEEE, MMMM d');
  const completedHabits = execution?.habitExecutions.filter((h) => h.isCompleted).length || 0;
  const totalHabits = execution?.habitExecutions.length || 0;

  if (executionLoading) {
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
          <View>
            <Text style={styles.greeting}>
              Good {getTimeOfDay()}, {user?.displayName?.split(' ')[0] || 'there'}!
            </Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakCount}>{user?.statistics?.currentStreak || 0}</Text>
          </View>
        </View>

        {/* Plan Progress */}
        {plan && (
          <TouchableOpacity 
            style={styles.planCard}
            onPress={() => router.push('/(tabs)/plan')}
            activeOpacity={0.8}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <View style={styles.weekBadge}>
                <Text style={styles.weekText}>Week {plan.currentWeek}/12</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(plan.currentWeek / 12) * 100}%` },
                ]}
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Score Summary */}
        <View style={styles.scoresContainer}>
          <ScoreCard score={execution?.scorecard.overallScore || 0} label="Today" />
          <ScoreCard score={execution?.scorecard.habitsScore || 0} label="Habits" />
          <ScoreCard score={execution?.scorecard.actionsScore || 0} label="Actions" />
        </View>

        {/* Habits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Habits</Text>
            <Text style={styles.sectionCount}>
              {completedHabits}/{totalHabits} completed
            </Text>
          </View>

          {execution?.habitExecutions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No habits for today</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/modals/create-habit')}
              >
                <Text style={styles.addButtonText}>+ Add Habit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {execution?.habitExecutions.map((he, index) => (
                <HabitCard
                  key={he.habitId}
                  habitExecution={he}
                  habitName={`Habit ${index + 1}`} // Would come from joined data
                  colorHex={colors.primary[500]}
                  currentStreak={0}
                  executionId={execution._id}
                  onComplete={() => handleCompleteHabit(he.habitId)}
                  onUncomplete={() => handleUncompleteHabit(he.habitId)}
                />
              ))}
            </>
          )}
        </View>

        {/* Daily Actions Section */}
        {execution?.dailyActions && execution.dailyActions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daily Actions</Text>
            </View>
            {execution.dailyActions.map((action) => (
              <View key={action._id} style={styles.actionCard}>
                <View
                  style={[
                    styles.actionCheckbox,
                    action.isCompleted && styles.actionCheckboxCompleted,
                  ]}
                >
                  {action.isCompleted && <Text style={styles.checkmarkText}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.actionText,
                    action.isCompleted && styles.actionTextCompleted,
                  ]}
                >
                  {action.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Reflection CTA */}
        {!execution?.reflection && totalHabits > 0 && (
          <TouchableOpacity
            style={styles.reflectionCta}
            onPress={() => router.push('/modals/reflection')}
            activeOpacity={0.8}
          >
            <Text style={styles.reflectionCtaText}>✨ Add Daily Reflection</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modals/create-habit')}
        activeOpacity={0.9}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  greeting: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[500] + '20',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  streakIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing[1],
  },
  streakCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.warning[500],
  },
  planCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  planTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    flex: 1,
  },
  weekBadge: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  weekText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary[400],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.dark.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  scoresContainer: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  scoreCard: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  scoreValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
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
  },
  sectionCount: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  habitIconDot: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
  },
  streakText: {
    fontSize: fontSize.xs,
    color: colors.warning[500],
    marginTop: spacing[1],
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
    marginBottom: spacing[4],
  },
  addButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  addButtonText: {
    color: colors.primary[500],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  actionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  actionCheckboxCompleted: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  actionText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.dark.text,
  },
  actionTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.dark.textMuted,
  },
  reflectionCta: {
    backgroundColor: colors.accent[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent[500] + '40',
  },
  reflectionCtaText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.accent[400],
  },
  fab: {
    position: 'absolute',
    bottom: spacing[6],
    right: spacing[4],
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.xl,
  },
  fabIcon: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});

