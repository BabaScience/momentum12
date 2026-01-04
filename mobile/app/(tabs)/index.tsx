import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
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
import { format, addDays, subDays, isToday, isFuture } from 'date-fns';
import {
  useGetTodayExecutionQuery,
  useGetExecutionByDateQuery,
  useCompleteHabitMutation,
  useUncompleteHabitMutation,
  useAddActionMutation,
  useCompleteActionMutation,
  useGetActivePlanQuery,
  useGetHabitsQuery,
} from '../../store/api';
import { useAppSelector } from '../../store';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows, getScoreColor } from '../../theme';
import type { HabitExecution, Habit } from '../../types';

// Date Selector Component
const DateSelector = ({
  selectedDate,
  onDateChange,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) => {
  const isCurrentDay = isToday(selectedDate);
  const canGoForward = !isCurrentDay;

  return (
    <View style={styles.dateSelector}>
      <TouchableOpacity
        style={styles.dateArrow}
        onPress={() => onDateChange(subDays(selectedDate, 1))}
      >
        <Text style={styles.dateArrowText}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.dateDisplay}
        onPress={() => onDateChange(new Date())}
      >
        <Text style={styles.dateText}>
          {isCurrentDay ? 'Today' : format(selectedDate, 'EEE, MMM d')}
        </Text>
        {!isCurrentDay && (
          <Text style={styles.dateTapHint}>Tap to go to today</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.dateArrow, !canGoForward && styles.dateArrowDisabled]}
        onPress={() => canGoForward && onDateChange(addDays(selectedDate, 1))}
        disabled={!canGoForward}
      >
        <Text style={[styles.dateArrowText, !canGoForward && styles.dateArrowTextDisabled]}>
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Habit Card Component
const HabitCard = ({
  habitExecution,
  habit,
  executionId,
  onComplete,
  onUncomplete,
  disabled,
}: {
  habitExecution: HabitExecution;
  habit?: Habit;
  executionId: string;
  onComplete: () => void;
  onUncomplete: () => void;
  disabled?: boolean;
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
    if (disabled) return;
    
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

  const habitName = habit?.name || 'Habit';
  const colorHex = habit?.appearance?.colorHex || colors.primary[500];
  const currentStreak = habit?.streakData?.currentStreak || 0;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} disabled={disabled}>
      <Animated.View style={[styles.habitCard, cardStyle, disabled && styles.habitCardDisabled]}>
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

// Add Action Modal
const AddActionModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
  isLoading: boolean;
}) => {
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Action title is required');
      return;
    }
    onSubmit(title.trim());
    setTitle('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Daily Action</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>What do you need to do?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Review project proposal"
              placeholderTextColor={colors.gray[500]}
              value={title}
              onChangeText={setTitle}
              multiline
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Action</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function TodayScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddAction, setShowAddAction] = useState(false);

  const isViewingToday = isToday(selectedDate);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Fetch today's execution or historical execution
  const {
    data: todayExecutionData,
    isLoading: todayLoading,
    refetch: refetchToday,
  } = useGetTodayExecutionQuery(undefined, { skip: !isViewingToday });

  const {
    data: historicalExecutionData,
    isLoading: historicalLoading,
    refetch: refetchHistorical,
  } = useGetExecutionByDateQuery(dateStr, { skip: isViewingToday });

  const { data: planData } = useGetActivePlanQuery();
  const { data: habitsData } = useGetHabitsQuery();
  
  const [completeHabit] = useCompleteHabitMutation();
  const [uncompleteHabit] = useUncompleteHabitMutation();
  const [addAction, { isLoading: isAddingAction }] = useAddActionMutation();
  const [completeAction] = useCompleteActionMutation();

  const execution = isViewingToday
    ? todayExecutionData?.data?.execution
    : historicalExecutionData?.data?.execution;
  const plan = planData?.data?.plan;
  const habits = habitsData?.data?.habits || [];

  // Create a map of habits for easy lookup
  const habitsMap = new Map(habits.map(h => [h._id, h]));

  const isLoading = isViewingToday ? todayLoading : historicalLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isViewingToday) {
      await refetchToday();
    } else {
      await refetchHistorical();
    }
    setRefreshing(false);
  }, [isViewingToday, refetchToday, refetchHistorical]);

  const handleCompleteHabit = async (habitId: string) => {
    if (!execution || !isViewingToday) return;
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
    if (!execution || !isViewingToday) return;
    try {
      await uncompleteHabit({
        executionId: execution._id,
        habitId,
      }).unwrap();
    } catch (error) {
      console.error('Failed to uncomplete habit:', error);
    }
  };

  const handleAddAction = async (title: string) => {
    if (!execution) return;
    try {
      await addAction({
        executionId: execution._id,
        action: { title },
      }).unwrap();
      setShowAddAction(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to add action');
    }
  };

  const handleCompleteAction = async (actionId: string) => {
    if (!execution || !isViewingToday) return;
    try {
      await completeAction({
        executionId: execution._id,
        actionId,
      }).unwrap();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Failed to complete action:', error);
    }
  };

  const displayDate = format(selectedDate, 'EEEE, MMMM d');
  const completedHabits = execution?.habitExecutions.filter((h) => h.isCompleted).length || 0;
  const totalHabits = execution?.habitExecutions.length || 0;
  const completedActions = execution?.dailyActions?.filter((a) => a.isCompleted).length || 0;
  const totalActions = execution?.dailyActions?.length || 0;

  if (isLoading) {
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
            <Text style={styles.date}>{displayDate}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakCount}>{user?.statistics?.currentStreak || 0}</Text>
          </View>
        </View>

        {/* Date Selector */}
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Historical Notice */}
        {!isViewingToday && (
          <View style={styles.historicalNotice}>
            <Text style={styles.historicalNoticeText}>
              📅 Viewing {format(selectedDate, 'MMM d, yyyy')} - Read only
            </Text>
          </View>
        )}

        {/* Plan Progress */}
        {plan && isViewingToday && (
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
          <ScoreCard score={execution?.scorecard.overallScore || 0} label="Overall" />
          <ScoreCard score={execution?.scorecard.habitsScore || 0} label="Habits" />
          <ScoreCard score={execution?.scorecard.actionsScore || 0} label="Actions" />
        </View>

        {/* Habits Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Habits</Text>
            <Text style={styles.sectionCount}>
              {completedHabits}/{totalHabits} completed
            </Text>
          </View>

          {execution?.habitExecutions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No habits for this day</Text>
              {isViewingToday && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => router.push('/modals/create-habit')}
                >
                  <Text style={styles.addButtonText}>+ Add Habit</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {execution?.habitExecutions.map((he) => (
                <HabitCard
                  key={he.habitId}
                  habitExecution={he}
                  habit={habitsMap.get(he.habitId)}
                  executionId={execution._id}
                  onComplete={() => handleCompleteHabit(he.habitId)}
                  onUncomplete={() => handleUncompleteHabit(he.habitId)}
                  disabled={!isViewingToday}
                />
              ))}
            </>
          )}
        </View>

        {/* Daily Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Actions</Text>
            {isViewingToday && (
              <TouchableOpacity onPress={() => setShowAddAction(true)}>
                <Text style={styles.addActionText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {(!execution?.dailyActions || execution.dailyActions.length === 0) ? (
            <View style={styles.emptyActionsState}>
              <Text style={styles.emptyActionsText}>No actions for this day</Text>
              {isViewingToday && (
                <TouchableOpacity
                  style={styles.addActionButton}
                  onPress={() => setShowAddAction(true)}
                >
                  <Text style={styles.addActionButtonText}>+ Add Action</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {totalActions > 0 && (
                <Text style={styles.actionsCount}>
                  {completedActions}/{totalActions} completed
                </Text>
              )}
              {execution.dailyActions.map((action) => (
                <TouchableOpacity
                  key={action._id}
                  style={styles.actionCard}
                  onPress={() => isViewingToday && !action.isCompleted && handleCompleteAction(action._id)}
                  disabled={!isViewingToday || action.isCompleted}
                  activeOpacity={0.8}
                >
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
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Reflection CTA */}
        {!execution?.reflection && totalHabits > 0 && isViewingToday && (
          <TouchableOpacity
            style={styles.reflectionCta}
            onPress={() => router.push('/modals/reflection')}
            activeOpacity={0.8}
          >
            <Text style={styles.reflectionCtaText}>✨ Add Daily Reflection</Text>
          </TouchableOpacity>
        )}

        {/* Show reflection if exists */}
        {execution?.reflection && (
          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionTitle}>📝 Daily Reflection</Text>
            {execution.reflection.gratitude && (
              <View style={styles.reflectionItem}>
                <Text style={styles.reflectionLabel}>Gratitude</Text>
                <Text style={styles.reflectionText}>{execution.reflection.gratitude}</Text>
              </View>
            )}
            {execution.reflection.learnings && (
              <View style={styles.reflectionItem}>
                <Text style={styles.reflectionLabel}>Learnings</Text>
                <Text style={styles.reflectionText}>{execution.reflection.learnings}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {isViewingToday && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/modals/create-habit')}
          activeOpacity={0.9}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Action Modal */}
      <AddActionModal
        visible={showAddAction}
        onClose={() => setShowAddAction(false)}
        onSubmit={handleAddAction}
        isLoading={isAddingAction}
      />
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
    marginBottom: spacing[4],
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  dateArrow: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: fontSize['2xl'],
    color: colors.primary[400],
    fontWeight: fontWeight.bold,
  },
  dateArrowTextDisabled: {
    color: colors.dark.textMuted,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  dateTapHint: {
    fontSize: fontSize.xs,
    color: colors.primary[400],
    marginTop: spacing[1],
  },
  historicalNotice: {
    backgroundColor: colors.warning[500] + '20',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  historicalNoticeText: {
    fontSize: fontSize.sm,
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
  addActionText: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
    fontWeight: fontWeight.medium,
  },
  actionsCount: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginBottom: spacing[2],
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
  habitCardDisabled: {
    opacity: 0.7,
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
  emptyActionsState: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  emptyActionsText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginBottom: spacing[3],
  },
  addActionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  addActionButtonText: {
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
    marginBottom: spacing[4],
  },
  reflectionCtaText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.accent[400],
  },
  reflectionCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  reflectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[3],
  },
  reflectionItem: {
    marginBottom: spacing[3],
  },
  reflectionLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginBottom: spacing[1],
  },
  reflectionText: {
    fontSize: fontSize.sm,
    color: colors.dark.text,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.dark.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: fontSize.base,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modalButton: {
    flex: 1,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.dark.border,
  },
  cancelButtonText: {
    color: colors.dark.text,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
