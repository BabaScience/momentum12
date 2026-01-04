import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';
import { format, addWeeks } from 'date-fns';
import { useCreatePlanMutation, useActivatePlanMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, categoryColors } from '../../theme';
import { GoalCategory } from '../../types';

const planSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  visionStatement: z.string().min(20, 'Vision must be at least 20 characters').max(1000),
});

type PlanFormData = z.infer<typeof planSchema>;

const categories = [
  { value: GoalCategory.HEALTH, label: 'Health', emoji: '💪' },
  { value: GoalCategory.CAREER, label: 'Career', emoji: '💼' },
  { value: GoalCategory.RELATIONSHIPS, label: 'Relationships', emoji: '❤️' },
  { value: GoalCategory.FINANCE, label: 'Finance', emoji: '💰' },
  { value: GoalCategory.PERSONAL, label: 'Personal', emoji: '🌟' },
  { value: GoalCategory.LEARNING, label: 'Learning', emoji: '📚' },
];

export default function CreatePlanModal() {
  const [createPlan, { isLoading }] = useCreatePlanMutation();
  const [activatePlan] = useActivatePlanMutation();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<{
    title: string;
    description: string;
    category: GoalCategory;
    targetValue: number;
    unit: string;
  }[]>([]);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: GoalCategory.PERSONAL,
    targetValue: 0,
    unit: '',
  });

  const startDate = new Date();
  const endDate = addWeeks(startDate, 12);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      title: '',
      visionStatement: '',
    },
  });

  const addGoal = () => {
    if (newGoal.title && newGoal.targetValue > 0 && newGoal.unit) {
      setGoals([...goals, newGoal]);
      setNewGoal({
        title: '',
        description: '',
        category: GoalCategory.PERSONAL,
        targetValue: 0,
        unit: '',
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onSubmit = async (data: PlanFormData) => {
    if (goals.length === 0) {
      setError('Add at least one strategic goal');
      return;
    }

    try {
      setError(null);
      const result = await createPlan({
        title: data.title,
        visionStatement: data.visionStatement,
        startDate: startDate.toISOString(),
        strategicGoals: goals.map((g, i) => ({
          title: g.title,
          description: g.description || g.title,
          category: g.category,
          priority: i + 1,
          measurement: {
            targetValue: g.targetValue,
            unit: g.unit,
          },
        })),
      }).unwrap();

      if (result.data?.plan) {
        await activatePlan(result.data.plan._id).unwrap();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      setError(err.data?.message || 'Failed to create plan');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create 12 Week Plan</Text>
        <View style={styles.headerRight}>
          {step === 2 ? (
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <Text style={styles.saveButton}>Create</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {step === 1 && (
          <>
            {/* Date Range */}
            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>Your 12 weeks</Text>
              <Text style={styles.dateRange}>
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </Text>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plan Title</Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.title && styles.inputError]}
                    placeholder="e.g., Q1 Health & Career Focus"
                    placeholderTextColor={colors.gray[500]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.title && (
                <Text style={styles.fieldError}>{errors.title.message}</Text>
              )}
            </View>

            {/* Vision */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vision Statement</Text>
              <Text style={styles.hint}>
                Describe what success looks like at the end of 12 weeks
              </Text>
              <Controller
                control={control}
                name="visionStatement"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea, errors.visionStatement && styles.inputError]}
                    placeholder="By the end of these 12 weeks, I will have..."
                    placeholderTextColor={colors.gray[500]}
                    multiline
                    numberOfLines={5}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.visionStatement && (
                <Text style={styles.fieldError}>{errors.visionStatement.message}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => {
                const title = watch('title');
                const vision = watch('visionStatement');
                if (title.length >= 3 && vision.length >= 20) {
                  setStep(2);
                }
              }}
            >
              <Text style={styles.nextButtonText}>Next: Add Goals</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
            >
              <Text style={styles.backButtonText}>← Back to Vision</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Strategic Goals</Text>
            <Text style={styles.stepSubtitle}>
              Add up to 5 goals you want to achieve (minimum 1)
            </Text>

            {/* Goal List */}
            {goals.map((goal, index) => (
              <View key={index} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={[styles.goalCategory, { backgroundColor: categoryColors[goal.category] + '20' }]}>
                    <Text style={styles.goalCategoryEmoji}>
                      {categories.find((c) => c.value === goal.category)?.emoji}
                    </Text>
                  </View>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalTarget}>
                      Target: {goal.targetValue} {goal.unit}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeGoal(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add Goal Form */}
            {goals.length < 5 && (
              <View style={styles.addGoalForm}>
                <Text style={styles.addGoalTitle}>Add Goal</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Goal title"
                  placeholderTextColor={colors.gray[500]}
                  value={newGoal.title}
                  onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                />

                <View style={styles.categorySelector}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryOption,
                        newGoal.category === cat.value && {
                          backgroundColor: categoryColors[cat.value] + '30',
                          borderColor: categoryColors[cat.value],
                        },
                      ]}
                      onPress={() => setNewGoal({ ...newGoal, category: cat.value })}
                    >
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.measurementRow}>
                  <TextInput
                    style={[styles.input, styles.measurementInput]}
                    placeholder="Target"
                    placeholderTextColor={colors.gray[500]}
                    keyboardType="numeric"
                    value={newGoal.targetValue ? String(newGoal.targetValue) : ''}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, targetValue: parseInt(text) || 0 })
                    }
                  />
                  <TextInput
                    style={[styles.input, styles.unitInput]}
                    placeholder="Unit (e.g., lbs, books)"
                    placeholderTextColor={colors.gray[500]}
                    value={newGoal.unit}
                    onChangeText={(text) => setNewGoal({ ...newGoal, unit: text })}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.addGoalButton,
                    (!newGoal.title || !newGoal.targetValue || !newGoal.unit) && styles.addGoalButtonDisabled,
                  ]}
                  onPress={addGoal}
                  disabled={!newGoal.title || !newGoal.targetValue || !newGoal.unit}
                >
                  <Text style={styles.addGoalButtonText}>+ Add Goal</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  cancelButton: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  saveButton: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary[500],
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: colors.dark.border,
  },
  progressDotActive: {
    backgroundColor: colors.primary[500],
  },
  progressLine: {
    width: 100,
    height: 2,
    backgroundColor: colors.dark.border,
    marginHorizontal: spacing[2],
  },
  progressLineActive: {
    backgroundColor: colors.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[24],
  },
  errorContainer: {
    backgroundColor: colors.danger[500] + '20',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.danger[500],
  },
  errorText: {
    color: colors.danger[400],
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  dateCard: {
    backgroundColor: colors.primary[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
    marginBottom: spacing[1],
  },
  dateRange: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  inputGroup: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
    marginBottom: spacing[2],
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: fontSize.base,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  inputError: {
    borderColor: colors.danger[500],
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.danger[400],
    fontSize: fontSize.xs,
    marginTop: spacing[1],
  },
  nextButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    marginTop: spacing[4],
  },
  nextButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  backButton: {
    marginBottom: spacing[4],
  },
  backButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary[400],
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginBottom: spacing[4],
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
  },
  goalCategory: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  goalCategoryEmoji: {
    fontSize: fontSize.xl,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  goalTarget: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  removeButton: {
    fontSize: fontSize.lg,
    color: colors.danger[500],
    padding: spacing[2],
  },
  addGoalForm: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  addGoalTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
    marginBottom: spacing[4],
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginVertical: spacing[3],
  },
  categoryOption: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryEmoji: {
    fontSize: fontSize.xl,
  },
  measurementRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  measurementInput: {
    flex: 1,
  },
  unitInput: {
    flex: 2,
  },
  addGoalButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  addGoalButtonDisabled: {
    backgroundColor: colors.dark.border,
  },
  addGoalButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

