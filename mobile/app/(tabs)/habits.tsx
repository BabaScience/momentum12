import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useGetHabitsQuery, useArchiveHabitMutation, useUpdateHabitMutation } from '../../store/api';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import type { Habit } from '../../types';

const ARCHIVE_THRESHOLD = -80;

const HabitListItem = ({
  habit,
  onPress,
  onArchive,
  onRestore,
}: {
  habit: Habit;
  onPress: () => void;
  onArchive: () => void;
  onRestore?: () => void;
}) => {
  const translateX = useSharedValue(0);
  const isArchived = habit.isArchived;

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleArchive = () => {
    triggerHaptic();
    onArchive();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -100);
      }
    })
    .onEnd((event) => {
      if (event.translationX < ARCHIVE_THRESHOLD) {
        runOnJS(handleArchive)();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const archiveButtonStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.abs(translateX.value) / Math.abs(ARCHIVE_THRESHOLD), 1),
  }));

  return (
    <View style={styles.habitItemContainer}>
      {/* Archive action background */}
      <Animated.View style={[styles.archiveAction, archiveButtonStyle]}>
        <Text style={styles.archiveActionText}>
          {isArchived ? '📥 Restore' : '📦 Archive'}
        </Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={[styles.habitItem, isArchived && styles.habitItemArchived]}
            onPress={onPress}
            onLongPress={() => {
              Alert.alert(
                habit.name,
                isArchived ? 'Restore this habit?' : 'Archive this habit?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: isArchived ? 'Restore' : 'Archive',
                    onPress: isArchived ? onRestore : onArchive,
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.habitContent}>
              <View
                style={[
                  styles.habitIcon,
                  { backgroundColor: habit.appearance.colorHex + '20' },
                  isArchived && styles.habitIconArchived,
                ]}
              >
                <View
                  style={[
                    styles.habitIconDot,
                    { backgroundColor: habit.appearance.colorHex },
                    isArchived && styles.habitIconDotArchived,
                  ]}
                />
              </View>
              <View style={styles.habitInfo}>
                <View style={styles.habitNameRow}>
                  <Text style={[styles.habitName, isArchived && styles.habitNameArchived]}>
                    {habit.name}
                  </Text>
                  {isArchived && (
                    <View style={styles.archivedBadge}>
                      <Text style={styles.archivedBadgeText}>Archived</Text>
                    </View>
                  )}
                </View>
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
                <Text style={[styles.streakValue, isArchived && styles.streakValueArchived]}>
                  {habit.streakData.currentStreak}
                </Text>
              </View>
              <Text style={styles.completionRate}>
                {habit.statistics.completionRate}%
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

type FilterType = 'active' | 'archived' | 'all';

export default function HabitsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('active');
  
  const { data, isLoading, refetch } = useGetHabitsQuery();
  const [archiveHabit] = useArchiveHabitMutation();
  const [updateHabit] = useUpdateHabitMutation();

  const allHabits = data?.data?.habits || [];
  
  // Filter habits based on selected filter
  const habits = allHabits.filter((habit) => {
    if (filter === 'active') return !habit.isArchived;
    if (filter === 'archived') return habit.isArchived;
    return true;
  });

  const activeCount = allHabits.filter(h => !h.isArchived).length;
  const archivedCount = allHabits.filter(h => h.isArchived).length;

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

  const handleArchiveHabit = async (habitId: string) => {
    try {
      await archiveHabit(habitId).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to archive habit');
    }
  };

  const handleRestoreHabit = async (habitId: string) => {
    try {
      await updateHabit({
        habitId,
        data: { isArchived: false },
      }).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to restore habit');
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'archived' && styles.filterTabActive]}
            onPress={() => setFilter('archived')}
          >
            <Text style={[styles.filterTabText, filter === 'archived' && styles.filterTabTextActive]}>
              Archived ({archivedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All ({allHabits.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swipe Hint */}
        {habits.length > 0 && filter === 'active' && (
          <Text style={styles.swipeHint}>💡 Swipe left or long press to archive</Text>
        )}

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {filter === 'archived' ? '📦' : '📋'}
            </Text>
            <Text style={styles.emptyTitle}>
              {filter === 'archived' ? 'No archived habits' : 'No habits yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'archived'
                ? 'Archived habits will appear here'
                : 'Create your first habit to start tracking your progress'}
            </Text>
            {filter !== 'archived' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/modals/create-habit')}
              >
                <Text style={styles.emptyButtonText}>Create Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlashList
            data={habits}
            renderItem={({ item }) => (
              <HabitListItem
                habit={item}
                onPress={() => handleHabitPress(item._id)}
                onArchive={() => handleArchiveHabit(item._id)}
                onRestore={() => handleRestoreHabit(item._id)}
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
    </GestureHandlerRootView>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  filterTab: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary[500],
  },
  filterTabText: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  swipeHint: {
    fontSize: fontSize.xs,
    color: colors.dark.textMuted,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  listContent: {
    padding: spacing[4],
    paddingTop: spacing[2],
  },
  habitItemContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  archiveAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: colors.warning[500],
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveActionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  habitItemArchived: {
    opacity: 0.7,
    borderStyle: 'dashed',
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
  habitIconArchived: {
    opacity: 0.5,
  },
  habitIconDot: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
  },
  habitIconDotArchived: {
    opacity: 0.5,
  },
  habitInfo: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  habitName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  habitNameArchived: {
    color: colors.dark.textSecondary,
  },
  archivedBadge: {
    backgroundColor: colors.warning[500] + '20',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5] || 2,
    borderRadius: borderRadius.sm,
  },
  archivedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.warning[500],
    fontWeight: fontWeight.medium,
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
  streakValueArchived: {
    color: colors.dark.textMuted,
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
