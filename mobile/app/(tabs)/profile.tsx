import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppSelector, useAppDispatch } from '../../store';
import { useLogoutMutation, useUpdatePreferencesMutation } from '../../store/api';
import { logout } from '../../store/authSlice';
import { secureStorage, appStorage } from '../../services/storage';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const SettingItem = ({
  label,
  value,
  onPress,
  showArrow = true,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.settingRight}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {showArrow && onPress && <Text style={styles.arrow}>›</Text>}
    </View>
  </TouchableOpacity>
);

const ToggleSetting = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => (
  <View style={styles.settingItem}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.dark.border, true: colors.primary[500] }}
      thumbColor={colors.white}
    />
  </View>
);

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutMutation] = useLogoutMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();

  const [dailyReminder, setDailyReminder] = useState(user?.preferences?.notifications?.dailyReminder ?? true);
  const [weeklyReview, setWeeklyReview] = useState(user?.preferences?.notifications?.weeklyReview ?? true);
  const [streakMilestones, setStreakMilestones] = useState(user?.preferences?.notifications?.streakMilestones ?? true);
  const [hapticFeedback, setHapticFeedback] = useState(user?.preferences?.hapticFeedback ?? true);

  const handlePreferenceChange = async (
    key: string,
    value: boolean,
    setter: (value: boolean) => void
  ) => {
    setter(value);
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      if (key.startsWith('notifications.')) {
        await updatePreferences({
          notifications: {
            [key.replace('notifications.', '')]: value,
          },
        }).unwrap();
      } else {
        await updatePreferences({ [key]: value }).unwrap();
      }
    } catch (error) {
      // Revert on error
      setter(!value);
      console.error('Failed to update preference:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const refreshToken = await secureStorage.getRefreshToken();
              await logoutMutation({ refreshToken: refreshToken || undefined }).unwrap();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              await secureStorage.clearTokens();
              await appStorage.clear();
              dispatch(logout());
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.statistics?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.statistics?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.statistics?.totalHabitsCompleted || 0}</Text>
            <Text style={styles.statLabel}>Habits Done</Text>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            <ToggleSetting
              label="Daily Reminder"
              value={dailyReminder}
              onValueChange={(v) =>
                handlePreferenceChange('notifications.dailyReminder', v, setDailyReminder)
              }
            />
            <ToggleSetting
              label="Weekly Review"
              value={weeklyReview}
              onValueChange={(v) =>
                handlePreferenceChange('notifications.weeklyReview', v, setWeeklyReview)
              }
            />
            <ToggleSetting
              label="Streak Milestones"
              value={streakMilestones}
              onValueChange={(v) =>
                handlePreferenceChange('notifications.streakMilestones', v, setStreakMilestones)
              }
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <ToggleSetting
              label="Haptic Feedback"
              value={hapticFeedback}
              onValueChange={(v) =>
                handlePreferenceChange('hapticFeedback', v, setHapticFeedback)
              }
            />
            <SettingItem
              label="Theme"
              value={user?.preferences?.theme === 'auto' ? 'Auto' : user?.preferences?.theme === 'dark' ? 'Dark' : 'Light'}
            />
            <SettingItem
              label="Reminder Time"
              value={user?.preferences?.notifications?.reminderTime || '08:00'}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingItem label="Edit Profile" onPress={() => {}} />
            <SettingItem label="Change Password" onPress={() => {}} />
            <SettingItem label="Export Data" onPress={() => {}} />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <SettingItem label="Help & FAQ" onPress={() => {}} />
            <SettingItem label="Privacy Policy" onPress={() => {}} />
            <SettingItem label="Terms of Service" onPress={() => {}} />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Momentum12 v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[24],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.dark.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  avatarText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.dark.text,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary[400],
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.textSecondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.dark.border,
    marginHorizontal: spacing[2],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginLeft: spacing[2],
  },
  sectionContent: {
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  settingLabel: {
    fontSize: fontSize.base,
    color: colors.dark.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: fontSize.base,
    color: colors.dark.textSecondary,
    marginRight: spacing[2],
  },
  arrow: {
    fontSize: fontSize.xl,
    color: colors.dark.textMuted,
  },
  logoutButton: {
    backgroundColor: colors.danger[500] + '20',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors.danger[500] + '40',
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.danger[500],
  },
  version: {
    fontSize: fontSize.sm,
    color: colors.dark.textMuted,
    textAlign: 'center',
  },
});

