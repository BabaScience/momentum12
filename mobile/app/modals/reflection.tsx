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
import * as Haptics from 'expo-haptics';
import { useGetTodayExecutionQuery, useAddReflectionMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

export default function ReflectionModal() {
  const { data: executionData } = useGetTodayExecutionQuery();
  const [addReflection, { isLoading }] = useAddReflectionMutation();

  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [learnings, setLearnings] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [error, setError] = useState<string | null>(null);

  const execution = executionData?.data?.execution;

  const handleSave = async () => {
    if (!execution) return;

    if (!wins.trim() || !challenges.trim() || !learnings.trim()) {
      setError('Please fill in wins, challenges, and learnings');
      return;
    }

    try {
      setError(null);
      await addReflection({
        executionId: execution._id,
        reflection: {
          wins: wins.trim(),
          challenges: challenges.trim(),
          learnings: learnings.trim(),
          gratitude: gratitude.trim() || undefined,
        },
      }).unwrap();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      setError(err.data?.message || 'Failed to save reflection');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Daily Reflection</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading}>
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

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "What gets measured gets managed"
          </Text>
          <Text style={styles.quoteAuthor}>— Peter Drucker</Text>
        </View>

        {/* Wins */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.labelIcon}>🏆</Text>
            <Text style={styles.label}>What were your wins today?</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Celebrate your achievements, no matter how small..."
            placeholderTextColor={colors.gray[500]}
            multiline
            numberOfLines={4}
            value={wins}
            onChangeText={setWins}
          />
        </View>

        {/* Challenges */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.labelIcon}>🎯</Text>
            <Text style={styles.label}>What challenges did you face?</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Be honest about what was difficult..."
            placeholderTextColor={colors.gray[500]}
            multiline
            numberOfLines={4}
            value={challenges}
            onChangeText={setChallenges}
          />
        </View>

        {/* Learnings */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.labelIcon}>💡</Text>
            <Text style={styles.label}>What did you learn?</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What insights can you carry forward..."
            placeholderTextColor={colors.gray[500]}
            multiline
            numberOfLines={4}
            value={learnings}
            onChangeText={setLearnings}
          />
        </View>

        {/* Gratitude (optional) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.labelIcon}>🙏</Text>
            <Text style={styles.label}>Gratitude (optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, styles.textAreaSmall]}
            placeholder="What are you grateful for today..."
            placeholderTextColor={colors.gray[500]}
            multiline
            numberOfLines={3}
            value={gratitude}
            onChangeText={setGratitude}
          />
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
  quoteCard: {
    backgroundColor: colors.accent[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[6],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent[500] + '40',
  },
  quoteText: {
    fontSize: fontSize.base,
    fontStyle: 'italic',
    color: colors.dark.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[2],
  },
  inputGroup: {
    marginBottom: spacing[5],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  labelIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing[2],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.dark.text,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    minHeight: 80,
  },
});

