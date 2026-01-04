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
import { useCreateHabitMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { FrequencyType } from '../../types';

const habitColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

const habitSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  description: z.string().max(500).optional(),
  frequencyType: z.nativeEnum(FrequencyType),
  colorHex: z.string(),
});

type HabitFormData = z.infer<typeof habitSchema>;

export default function CreateHabitModal() {
  const [createHabit, { isLoading }] = useCreateHabitMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      description: '',
      frequencyType: FrequencyType.DAILY,
      colorHex: habitColors[0],
    },
  });

  const selectedColor = watch('colorHex');
  const selectedFrequency = watch('frequencyType');

  const onSubmit = async (data: HabitFormData) => {
    try {
      setError(null);
      await createHabit({
        name: data.name,
        description: data.description || undefined,
        frequency: { type: data.frequencyType },
        appearance: {
          iconName: 'check-circle',
          colorHex: data.colorHex,
        },
      }).unwrap();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      setError(err.data?.message || 'Failed to create habit');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Habit</Text>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
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

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Habit Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="e.g., Morning Meditation"
                placeholderTextColor={colors.gray[500]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && (
            <Text style={styles.fieldError}>{errors.name.message}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a description..."
                placeholderTextColor={colors.gray[500]}
                multiline
                numberOfLines={3}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.frequencyOptions}>
            {[
              { value: FrequencyType.DAILY, label: 'Daily' },
              { value: FrequencyType.WEEKLY, label: 'Weekly' },
              { value: FrequencyType.CUSTOM, label: 'Custom' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyButton,
                  selectedFrequency === option.value && styles.frequencyButtonSelected,
                ]}
                onPress={() => setValue('frequencyType', option.value)}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    selectedFrequency === option.value && styles.frequencyButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorOptions}>
            {habitColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorButtonSelected,
                ]}
                onPress={() => setValue('colorHex', color)}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
              <View style={[styles.previewIconDot, { backgroundColor: selectedColor }]} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{watch('name') || 'Habit Name'}</Text>
              <Text style={styles.previewFrequency}>
                {selectedFrequency === FrequencyType.DAILY
                  ? 'Every day'
                  : selectedFrequency === FrequencyType.WEEKLY
                  ? 'Weekly'
                  : 'Custom'}
              </Text>
            </View>
            <View style={styles.previewCheckbox} />
          </View>
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
  saveButton: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
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
  inputGroup: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: colors.danger[400],
    fontSize: fontSize.xs,
    marginTop: spacing[1],
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: spacing[3],
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  frequencyButtonSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  frequencyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSecondary,
  },
  frequencyButtonTextSelected: {
    color: colors.white,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  colorCheckmark: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  preview: {
    marginTop: spacing[4],
  },
  previewLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.textSecondary,
    marginBottom: spacing[2],
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  previewIconDot: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
  },
  previewFrequency: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  previewCheckbox: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
});

