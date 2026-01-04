import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  previousStreak?: number;
}

export function StreakBadge({
  streak,
  size = 'md',
  showAnimation = true,
  previousStreak,
}: StreakBadgeProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (showAnimation && previousStreak !== undefined && streak > previousStreak) {
      // Celebrate streak increase
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );

      // Special celebration for milestone streaks (7, 14, 21, 30, etc.)
      if (streak % 7 === 0) {
        rotation.value = withSequence(
          withTiming(10, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(0, { duration: 100 })
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [streak, previousStreak, showAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  };

  const textSizeStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  const iconSizeStyles = {
    sm: styles.iconSm,
    md: styles.iconMd,
    lg: styles.iconLg,
  };

  return (
    <Animated.View style={[styles.container, sizeStyles[size], animatedStyle]}>
      <Text style={iconSizeStyles[size]}>🔥</Text>
      <Text style={[styles.text, textSizeStyles[size]]}>{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[500] + '20',
    borderRadius: borderRadius.full,
  },

  // Sizes
  sizeSm: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing[1],
  },
  sizeMd: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[1],
  },
  sizeLg: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },

  // Text
  text: {
    fontWeight: fontWeight.bold,
    color: colors.warning[500],
  },
  textSm: {
    fontSize: fontSize.xs,
  },
  textMd: {
    fontSize: fontSize.sm,
  },
  textLg: {
    fontSize: fontSize.lg,
  },

  // Icons
  iconSm: {
    fontSize: fontSize.xs,
  },
  iconMd: {
    fontSize: fontSize.sm,
  },
  iconLg: {
    fontSize: fontSize.lg,
  },
});

