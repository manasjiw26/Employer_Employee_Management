import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { useAuth } from '../_layout';
import { User, Bell, DollarSign, LogOut, Check, Edit2 } from 'lucide-react-native';

export default function EmployeeProfile() {
  const { profile, logout, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'PAYSLIPS' | 'NOTIFICATIONS' | 'SETTINGS'>('PAYSLIPS');

  // Avatar simulated upload input
  const [simulatedAvatarUrl, setSimulatedAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(profile?.name || '');
  const [savingName, setSavingName] = useState(false);

  const fetchProfileDetails = async () => {
    try {
      setLoading(true);
      const notifList = await apiFetch('/misc/notifications');
      setNotifications(notifList);

      const payslipList = await apiFetch('/payroll/my');
      setPayslips(payslipList);
    } catch (err: any) {
      console.log('Error fetching profile detail arrays:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const handleMarkRead = async (notifId: string) => {
    try {
      await apiFetch(`/misc/notifications/${notifId}/read`, {
        method: 'PATCH',
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err: any) {
      console.log('Error marking notification read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/misc/notifications/read-all', {
        method: 'PATCH',
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to mark all as read');
    }
  };

  const handleSimulatedAvatarUpdate = async () => {
    if (!simulatedAvatarUrl) {
      Alert.alert('Error', 'Please enter a valid image URL.');
      return;
    }

    setUploading(true);
    try {
      // 1. Get signed upload URL from backend
      // Normally this uploads a file, but since we are in a developer environment and testing on simulators,
      // we'll update the profile URL directly via the avatar profile update route in our Express backend.
      // The backend route router.patch('/me/avatar', authenticate, updateAvatarUrl) takes { avatarUrl }
      // and updates profiles.avatar_url. Let's call it!
      const updatedProfile = await apiFetch('/auth/me/avatar', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: simulatedAvatarUrl }),
      });

      Alert.alert('Success', 'Avatar updated successfully!');
      setSimulatedAvatarUrl('');
      // Update global context profile state
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editingName) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: editingName }),
      });
      Alert.alert('Success', 'Profile updated');
      await refreshProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User color={Colors.textSecondary} size={48} />
          </View>
        )}

        <Text style={styles.userName}>{profile?.name}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {(['PAYSLIPS', 'NOTIFICATIONS', 'SETTINGS'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Contents */}
      <View style={styles.tabContent}>
        {/* PAYSLIPS TAB */}
        {activeTab === 'PAYSLIPS' && (
          <View>
            <Text style={styles.tabHeading}>My Payroll History</Text>
            {loading && payslips.length === 0 ? (
              <ActivityIndicator color={Colors.primary} />
            ) : payslips.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No payslips generated yet.</Text>
              </View>
            ) : (
              payslips.map((pay) => (
                <View key={pay.id} style={styles.payslipCard}>
                  <View style={styles.payslipHeader}>
                    <View style={styles.payslipPeriodRow}>
                      <DollarSign color={Colors.success} size={16} />
                      <Text style={styles.payslipPeriod}>Period: {pay.month}/{pay.year}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      pay.status === 'PAID' ? styles.statusPaid : styles.statusUnpaid
                    ]}>
                      <Text style={[
                        styles.statusText,
                        pay.status === 'PAID' ? { color: Colors.success } : { color: Colors.danger }
                      ]}>{pay.status}</Text>
                    </View>
                  </View>

                  <View style={styles.payslipBody}>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Base Salary:</Text>
                      <Text style={styles.salaryVal}>${pay.base_salary}</Text>
                    </View>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Bonuses:</Text>
                      <Text style={[styles.salaryVal, { color: Colors.success }]}>+${pay.bonuses}</Text>
                    </View>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Deductions:</Text>
                      <Text style={[styles.salaryVal, { color: Colors.danger }]}>-${pay.deductions}</Text>
                    </View>
                    <View style={[styles.salaryRow, styles.netSalaryRow]}>
                      <Text style={styles.netSalaryLabel}>Net Take-Home:</Text>
                      <Text style={styles.netSalaryVal}>${pay.net_salary}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'NOTIFICATIONS' && (
          <View>
            <View style={styles.notificationsHeadingRow}>
              <Text style={styles.tabHeading}>Notifications ({notifications.filter(n => !n.read).length} unread)</Text>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.clearAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading && notifications.length === 0 ? (
              <ActivityIndicator color={Colors.primary} />
            ) : notifications.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>You're all caught up!</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifCard, notif.read && styles.notifCardRead]}
                  onPress={() => !notif.read && handleMarkRead(notif.id)}
                  activeOpacity={notif.read ? 1 : 0.7}
                >
                  <View style={styles.notifHeader}>
                    <View style={styles.notifTitleRow}>
                      <Bell color={notif.read ? Colors.textMuted : Colors.primary} size={16} />
                      <Text style={[styles.notifTitle, notif.read && styles.notifTextRead]}>{notif.title}</Text>
                    </View>
                    {!notif.read && (
                      <TouchableOpacity style={styles.readDot} onPress={() => handleMarkRead(notif.id)}>
                        <Check color={Colors.success} size={14} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.notifMessage, notif.read && styles.notifTextRead]}>{notif.message}</Text>
                  <Text style={styles.notifDate}>{new Date(notif.created_at).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
          <View>
            <Text style={styles.tabHeading}>Profile Settings</Text>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>Update Avatar Photo URL</Text>
              <Text style={styles.settingsDesc}>
                Provide an image URL (jpg, png, or webp) to refresh your employee profile picture.
              </Text>
              
              <TextInput
                style={styles.settingsInput}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor={Colors.textMuted}
                value={simulatedAvatarUrl}
                onChangeText={setSimulatedAvatarUrl}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleSimulatedAvatarUpdate}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <View style={styles.uploadBtnContent}>
                    <Edit2 color={Colors.onPrimary} size={16} />
                    <Text style={styles.uploadBtnText}>Update Profile Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>Display Name</Text>
              <TextInput
                style={styles.settingsInput}
                value={editingName}
                onChangeText={setEditingName}
              />
              <TouchableOpacity style={[styles.uploadBtn, { marginTop: 8 }]} onPress={handleSaveName} disabled={savingName}>
                {savingName ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.uploadBtnText}>Save Profile</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <LogOut color={Colors.danger} size={18} />
              <Text style={styles.logoutText}>Logout Account</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  userName: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.onPrimary,
  },
  tabContent: {
    minHeight: 200,
  },
  tabHeading: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  payslipCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  payslipPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payslipPeriod: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: Colors.tagGreen,
  },
  statusUnpaid: {
    backgroundColor: Colors.tagRed,
  },
  statusText: {
    fontFamily: 'Outfit',
    fontSize: 10,
    fontWeight: '800',
  },
  payslipBody: {
    paddingHorizontal: 4,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  salaryLabel: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  salaryVal: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.text,
  },
  netSalaryRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  netSalaryLabel: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  netSalaryVal: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  notificationsHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearAllText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '600',
  },
  notifCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notifCardRead: {
    opacity: 0.65,
    borderLeftColor: Colors.border,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifTitle: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  notifTextRead: {
    color: Colors.textSecondary,
  },
  readDot: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 4,
  },
  notifMessage: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  notifDate: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  settingsGroup: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  settingsLabel: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  settingsDesc: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  settingsInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 13,
    marginBottom: 12,
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadBtnText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
    marginLeft: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tagRed,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 16,
    padding: 16,
  },
  logoutText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
    marginLeft: 8,
  },
});
