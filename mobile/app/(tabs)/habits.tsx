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
import { FlashList } from '@shopify/flash-list';
import { useGetHabitsQuery, useDeleteHabitMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';
import type { Habit } from '../../types';

const HabitListItem = ({ habit, onPress }: { habit: Habit; onPress: () => void }) => {
  return (
    <TouchableOpacity style={styles.habitItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.habitContent}>
        <View
          style={[styles.habitIcon, { backgroundColor: habit.appearance.colorHex + '20' }]}
        >
          <View
            style={[styles.habitIconDot, { backgroundColor: habit.appearance.colorHex }]}
          />
        </View>
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{habit.name}</Text>
          <Text style={styles.habitFrequency}>
            {habit.frequency.type === 'daily'
              ? 'Every day'
              : habit.frequency.type === 'weekly'
              ? `${habit.frequency.timesPerWeek}x per week`
              : 'Custom'}
          </Text>
        </View>
      </View>
      <View style={styles.habitStats}>
        <View style={styles.streakContainer}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakValue}>{habit.streakData.currentStreak}</Text>
        </View>
        <Text style={styles.completionRate}>
          {habit.statistics.completionRate}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function HabitsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useGetHabitsQuery();

  const habits = data?.data?.habits || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleHabitPress = (habitId: string) => {
    router.push({
      pathname: '/modals/habit-detail',
      params: { id: habitId },
    });
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/modals/create-habit')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptyText}>
            Create your first habit to start tracking your progress
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/modals/create-habit')}
          >
            <Text style={styles.emptyButtonText}>Create Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={habits}
          renderItem={({ item }) => (
            <HabitListItem
              habit={item}
              onPress={() => handleHabitPress(item._id)}
            />
          )}
          keyExtractor={(item) => item._id}
          estimatedItemSize={88}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[2],
  },
  habitItem: {
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
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  habitIconDot: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  habitFrequency: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  habitStats: {
    alignItems: 'flex-end',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing[1],
  },
  streakValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.warning[500],
  },
  completionRate: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
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
});

