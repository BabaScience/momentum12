import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppSelector, useAppDispatch } from '../../store';
import {
  useLogoutMutation,
  useUpdatePreferencesMutation,
  useGetUserStatisticsQuery,
  useChangePasswordMutation,
  useDeleteAccountMutation,
} from '../../store/api';
import { logout } from '../../store/authSlice';
import { secureStorage, appStorage } from '../../services/storage';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

const SettingItem = ({
  label,
  value,
  onPress,
  showArrow = true,
  danger = false,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  danger?: boolean;
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
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

// Change Password Modal Component
const ChangePasswordModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => void;
  isLoading: boolean;
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    onSubmit(currentPassword, newPassword);
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleClose}
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
                <Text style={styles.submitButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutMutation] = useLogoutMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  // Fetch real-time user statistics
  const { data: statsData, isLoading: statsLoading } = useGetUserStatisticsQuery();
  const statistics = statsData?.data?.statistics;

  const [dailyReminder, setDailyReminder] = useState(user?.preferences?.notifications?.dailyReminder ?? true);
  const [weeklyReview, setWeeklyReview] = useState(user?.preferences?.notifications?.weeklyReview ?? true);
  const [streakMilestones, setStreakMilestones] = useState(user?.preferences?.notifications?.streakMilestones ?? true);
  const [hapticFeedback, setHapticFeedback] = useState(user?.preferences?.hapticFeedback ?? true);

  // Modal states
  const [showChangePassword, setShowChangePassword] = useState(false);

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

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setShowChangePassword(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Your password has been updated.');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.data?.message || 'Failed to change password. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.prompt(
              'Confirm Deletion',
              'Enter your password to confirm account deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }
                    try {
                      await deleteAccount({ password }).unwrap();
                      await secureStorage.clearTokens();
                      await appStorage.clear();
                      dispatch(logout());
                      router.replace('/(auth)/login');
                    } catch (error: any) {
                      Alert.alert('Error', error.data?.message || 'Failed to delete account');
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ]
    );
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

  // Use real-time stats if available, fallback to user object
  const currentStreak = statistics?.currentStreak ?? user?.statistics?.currentStreak ?? 0;
  const longestStreak = statistics?.longestStreak ?? user?.statistics?.longestStreak ?? 0;
  const totalHabitsCompleted = statistics?.totalHabitsCompleted ?? user?.statistics?.totalHabitsCompleted ?? 0;

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
          {statsLoading ? (
            <View style={styles.statsLoading}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{longestStreak}</Text>
                <Text style={styles.statLabel}>Longest Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalHabitsCompleted}</Text>
                <Text style={styles.statLabel}>Habits Done</Text>
              </View>
            </>
          )}
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
            <SettingItem label="Change Password" onPress={() => setShowChangePassword(true)} />
            <SettingItem label="Export Data" onPress={() => {}} />
            <SettingItem 
              label="Delete Account" 
              onPress={handleDeleteAccount}
              danger
              showArrow={false}
            />
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

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={handleChangePassword}
        isLoading={isChangingPassword}
      />
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
    minHeight: 80,
  },
  statsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  dangerText: {
    color: colors.danger[500],
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
  errorBox: {
    backgroundColor: colors.danger[500] + '20',
    borderRadius: borderRadius.md,
    padding: spacing[3],
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
