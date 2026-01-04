import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from '../store';

export function useHaptics() {
  const hapticFeedback = useAppSelector(
    (state) => state.auth.user?.preferences?.hapticFeedback ?? true
  );

  const impact = useCallback(
    async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
      if (hapticFeedback) {
        await Haptics.impactAsync(style);
      }
    },
    [hapticFeedback]
  );

  const notification = useCallback(
    async (type: Haptics.NotificationFeedbackType) => {
      if (hapticFeedback) {
        await Haptics.notificationAsync(type);
      }
    },
    [hapticFeedback]
  );

  const selection = useCallback(async () => {
    if (hapticFeedback) {
      await Haptics.selectionAsync();
    }
  }, [hapticFeedback]);

  return {
    impact,
    notification,
    selection,
    impactLight: () => impact(Haptics.ImpactFeedbackStyle.Light),
    impactMedium: () => impact(Haptics.ImpactFeedbackStyle.Medium),
    impactHeavy: () => impact(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => notification(Haptics.NotificationFeedbackType.Success),
    warning: () => notification(Haptics.NotificationFeedbackType.Warning),
    error: () => notification(Haptics.NotificationFeedbackType.Error),
  };
}

