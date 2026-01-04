import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useGetActivePlanQuery,
  useGetPlanProgressQuery,
  useDeletePlanMutation,
  useAddStrategicGoalMutation,
  useUpdateStrategicGoalMutation,
  useDeleteStrategicGoalMutation,
  useAddWeeklyGoalMutation,
  useUpdateWeeklyGoalMutation,
} from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, getScoreColor, categoryColors } from '../../theme';
import type { TwelveWeekPlan, StrategicGoal, WeeklyGoal } from '../../types';

const CATEGORIES = ['health', 'career', 'relationships', 'personal', 'financial', 'other'] as const;

const WeekSelector = ({
  currentWeek,
  selectedWeek,
  onSelectWeek,
  weeklyProgress,
}: {
  currentWeek: number;
  selectedWeek: number;
  onSelectWeek: (week: number) => void;
  weeklyProgress?: { weekNumber: number; completionRate: number }[];
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.weekSelectorContent}
    >
      {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
        const isSelected = week === selectedWeek;
        const isPast = week < currentWeek;
        const isCurrent = week === currentWeek;
        const progress = weeklyProgress?.find(w => w.weekNumber === week)?.completionRate || 0;

        return (
          <TouchableOpacity
            key={week}
            style={[
              styles.weekButton,
              isSelected && styles.weekButtonSelected,
              isCurrent && !isSelected && styles.weekButtonCurrent,
            ]}
            onPress={() => onSelectWeek(week)}
          >
            <Text
              style={[
                styles.weekButtonText,
                isSelected && styles.weekButtonTextSelected,
                isPast && !isSelected && styles.weekButtonTextPast,
              ]}
            >
              {week}
            </Text>
            {isPast && progress > 0 && (
              <View style={[styles.weekProgressDot, { backgroundColor: getScoreColor(progress) }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const GoalCard = ({
  goal,
  planId,
  onEdit,
  onDelete,
}: {
  goal: StrategicGoal;
  planId: string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const progress = goal.measurement.targetValue > 0
    ? Math.round((goal.measurement.currentValue / goal.measurement.targetValue) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.goalCard}
      onLongPress={() => {
        Alert.alert(
          goal.title,
          'What would you like to do?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: onEdit },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]
        );
      }}
      activeOpacity={0.8}
    >
      <View style={styles.goalHeader}>
        <View style={[styles.goalCategoryBadge, { backgroundColor: categoryColors[goal.category] + '20' }]}>
          <View style={[styles.goalCategoryDot, { backgroundColor: categoryColors[goal.category] }]} />
        </View>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalCategoryText}>{goal.category}</Text>
        </View>
        {goal.isAchieved && (
          <View style={styles.achievedBadge}>
            <Text style={styles.achievedText}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.goalProgress}>
        <View style={styles.goalProgressBar}>
          <View style={[styles.goalProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.goalProgressText}>
          {goal.measurement.currentValue}/{goal.measurement.targetValue} {goal.measurement.unit}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const WeeklyGoalItem = ({
  goal,
  onToggle,
  isUpdating,
}: {
  goal: WeeklyGoal;
  onToggle: () => void;
  isUpdating: boolean;
}) => {
  return (
    <TouchableOpacity
      style={styles.weeklyGoalItem}
      onPress={onToggle}
      activeOpacity={0.8}
      disabled={isUpdating}
    >
      <View
        style={[
          styles.weeklyGoalCheckbox,
          goal.isCompleted && styles.weeklyGoalCheckboxCompleted,
        ]}
      >
        {isUpdating ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : goal.isCompleted ? (
          <Text style={styles.checkmarkText}>✓</Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.weeklyGoalText,
          goal.isCompleted && styles.weeklyGoalTextCompleted,
        ]}
      >
        {goal.description}
      </Text>
    </TouchableOpacity>
  );
};

// Add Strategic Goal Modal
const AddStrategicGoalModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (goal: { title: string; category: string; targetValue: number; unit: string }) => void;
  isLoading: boolean;
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('personal');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    onSubmit({
      title: title.trim(),
      category,
      targetValue: parseInt(targetValue) || 0,
      unit: unit.trim() || 'times',
    });
    setTitle('');
    setCategory('personal');
    setTargetValue('');
    setUnit('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Strategic Goal</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Run a marathon"
              placeholderTextColor={colors.gray[500]}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categorySelector}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && { backgroundColor: categoryColors[cat] },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && { color: colors.white },
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Target</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={colors.gray[500]}
                keyboardType="number-pad"
                value={targetValue}
                onChangeText={setTargetValue}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: spacing[3] }]}>
              <Text style={styles.inputLabel}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="miles"
                placeholderTextColor={colors.gray[500]}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
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
                <Text style={styles.submitButtonText}>Add Goal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add Weekly Goal Modal
const AddWeeklyGoalModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
  weekNumber,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
  isLoading: boolean;
  weekNumber: number;
}) => {
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }
    onSubmit(description.trim());
    setDescription('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Week {weekNumber} Goal</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Goal Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Complete chapter 5 of the book"
              placeholderTextColor={colors.gray[500]}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
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
                <Text style={styles.submitButtonText}>Add Goal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PlanScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showAddStrategicGoal, setShowAddStrategicGoal] = useState(false);
  const [showAddWeeklyGoal, setShowAddWeeklyGoal] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);

  const { data: activePlanData, isLoading, refetch } = useGetActivePlanQuery();
  const plan = activePlanData?.data?.plan;

  // Fetch plan progress when we have a plan
  const { data: progressData } = useGetPlanProgressQuery(plan?._id || '', {
    skip: !plan?._id,
  });
  const progress = progressData?.data?.progress;

  // Mutations
  const [deletePlan, { isLoading: isDeletingPlan }] = useDeletePlanMutation();
  const [addStrategicGoal, { isLoading: isAddingStrategicGoal }] = useAddStrategicGoalMutation();
  const [updateStrategicGoal] = useUpdateStrategicGoalMutation();
  const [deleteStrategicGoal] = useDeleteStrategicGoalMutation();
  const [addWeeklyGoal, { isLoading: isAddingWeeklyGoal }] = useAddWeeklyGoalMutation();
  const [updateWeeklyGoal] = useUpdateWeeklyGoalMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Update selected week when plan loads
  if (plan && selectedWeek !== plan.currentWeek && selectedWeek === 1) {
    setSelectedWeek(plan.currentWeek);
  }

  const weeklyGoals = plan?.weeklyGoals.filter((g) => g.weekNumber === selectedWeek) || [];

  const handleDeletePlan = () => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(plan!._id).unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const handleAddStrategicGoal = async (goal: { title: string; category: string; targetValue: number; unit: string }) => {
    try {
      await addStrategicGoal({
        planId: plan!._id,
        goal: {
          title: goal.title,
          category: goal.category as any,
          targetMetric: {
            name: goal.title,
            target: goal.targetValue,
            unit: goal.unit,
          },
        },
      }).unwrap();
      setShowAddStrategicGoal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to add goal');
    }
  };

  const handleDeleteStrategicGoal = async (goalId: string) => {
    try {
      await deleteStrategicGoal({ planId: plan!._id, goalId }).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete goal');
    }
  };

  const handleAddWeeklyGoal = async (description: string) => {
    try {
      await addWeeklyGoal({
        planId: plan!._id,
        goal: {
          weekNumber: selectedWeek,
          title: description,
        },
      }).unwrap();
      setShowAddWeeklyGoal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to add weekly goal');
    }
  };

  const handleToggleWeeklyGoal = async (goal: WeeklyGoal) => {
    setUpdatingGoalId(goal._id);
    try {
      await updateWeeklyGoal({
        planId: plan!._id,
        goalId: goal._id,
        data: { isCompleted: !goal.isCompleted },
      }).unwrap();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal');
    } finally {
      setUpdatingGoalId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerSimple}>
          <Text style={styles.title}>12 Week Plan</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No active plan</Text>
          <Text style={styles.emptyText}>
            Create a 12-week plan to start tracking your goals
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/modals/create-plan')}
          >
            <Text style={styles.emptyButtonText}>Create Plan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

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
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.subtitle}>Week {plan.currentWeek} of 12</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                Alert.alert(
                  'Plan Options',
                  '',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete Plan', style: 'destructive', onPress: handleDeletePlan },
                  ]
                );
              }}
            >
              <Text style={styles.menuButtonText}>⋮</Text>
            </TouchableOpacity>
            <View style={styles.countdown}>
              <Text style={styles.countdownValue}>{daysRemaining}</Text>
              <Text style={styles.countdownLabel}>days left</Text>
            </View>
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreCard, { backgroundColor: getScoreColor(plan.executionMetrics.overallScore) + '20' }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(plan.executionMetrics.overallScore) }]}>
              {plan.executionMetrics.overallScore}%
            </Text>
            <Text style={styles.scoreLabel}>Execution Score</Text>
          </View>
          <View style={styles.metricsContainer}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{plan.executionMetrics.habitCompletionRate}%</Text>
              <Text style={styles.metricLabel}>Habits</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{plan.executionMetrics.goalCompletionRate}%</Text>
              <Text style={styles.metricLabel}>Goals</Text>
            </View>
          </View>
        </View>

        {/* Week Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Week</Text>
          <WeekSelector
            currentWeek={plan.currentWeek}
            selectedWeek={selectedWeek}
            onSelectWeek={setSelectedWeek}
            weeklyProgress={progress?.weeklyProgress}
          />
        </View>

        {/* Strategic Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Strategic Goals</Text>
            <TouchableOpacity
              style={styles.addSectionButton}
              onPress={() => setShowAddStrategicGoal(true)}
            >
              <Text style={styles.addSectionButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {plan.strategicGoals.length === 0 ? (
            <View style={styles.noGoals}>
              <Text style={styles.noGoalsText}>No strategic goals yet</Text>
            </View>
          ) : (
            plan.strategicGoals.map((goal) => (
              <GoalCard
                key={goal._id}
                goal={goal}
                planId={plan._id}
                onEdit={() => {}}
                onDelete={() => handleDeleteStrategicGoal(goal._id)}
              />
            ))
          )}
        </View>

        {/* Weekly Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Week {selectedWeek} Goals</Text>
            <TouchableOpacity
              style={styles.addSectionButton}
              onPress={() => setShowAddWeeklyGoal(true)}
            >
              <Text style={styles.addSectionButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {weeklyGoals.length === 0 ? (
            <View style={styles.noGoals}>
              <Text style={styles.noGoalsText}>No goals for this week</Text>
            </View>
          ) : (
            weeklyGoals.map((goal) => (
              <WeeklyGoalItem
                key={goal._id}
                goal={goal}
                onToggle={() => handleToggleWeeklyGoal(goal)}
                isUpdating={updatingGoalId === goal._id}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <AddStrategicGoalModal
        visible={showAddStrategicGoal}
        onClose={() => setShowAddStrategicGoal(false)}
        onSubmit={handleAddStrategicGoal}
        isLoading={isAddingStrategicGoal}
      />
      <AddWeeklyGoalModal
        visible={showAddWeeklyGoal}
        onClose={() => setShowAddWeeklyGoal(false)}
        onSubmit={handleAddWeeklyGoal}
        isLoading={isAddingWeeklyGoal}
        weekNumber={selectedWeek}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
  },
  headerSimple: {
    padding: spacing[4],
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuButton: {
    padding: spacing[2],
  },
  menuButtonText: {
    fontSize: fontSize['2xl'],
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.bold,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  countdown: {
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  countdownValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary[400],
  },
  countdownLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  scoreSection: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  scoreCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  metricsContainer: {
    flex: 1,
    gap: spacing[2],
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
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
  addSectionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  addSectionButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
    fontWeight: fontWeight.medium,
  },
  weekSelectorContent: {
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  weekButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  weekButtonSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  weekButtonCurrent: {
    borderColor: colors.primary[500],
  },
  weekButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  weekButtonTextSelected: {
    color: colors.white,
  },
  weekButtonTextPast: {
    color: colors.dark.textMuted,
  },
  weekProgressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  goalCard: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  goalCategoryBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  goalCategoryDot: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  goalCategoryText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
    textTransform: 'capitalize',
  },
  achievedBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievedText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  goalProgress: {
    gap: spacing[2],
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: colors.dark.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },
  goalProgressText: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
  },
  weeklyGoalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  weeklyGoalCheckbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  weeklyGoalCheckboxCompleted: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  checkmarkText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  weeklyGoalText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.dark.text,
  },
  weeklyGoalTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.dark.textMuted,
  },
  noGoals: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  noGoalsText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  emptyButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  categoryButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.border,
  },
  categoryButtonText: {
    fontSize: fontSize.sm,
    color: colors.dark.text,
    textTransform: 'capitalize',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
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
