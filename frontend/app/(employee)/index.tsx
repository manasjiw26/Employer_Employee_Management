import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { useAuth } from '../_layout';
import { Megaphone, CheckSquare, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function EmployeeHome() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [balances, setBalances] = useState<{ sick_balance?: number; casual_balance?: number; annual_balance?: number }>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const annList = await apiFetch('/misc/announcements');
      setAnnouncements(annList);

      const tasksList = await apiFetch('/tasks/my');
      setMyTasksCount(tasksList.filter((t: any) => t.status !== 'DONE').length);

      const notifList = await apiFetch('/misc/notifications');
      setUnreadNotifications(notifList.filter((n: any) => !n.read).length);

      // Fetch leave balances
      try {
        const b = await apiFetch('/balances/me');
        setBalances(b || {});
      } catch (err) {
        console.warn('Failed to fetch balances', err);
      }
    } catch (err: any) {
      console.log('Error fetching employee landing data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && announcements.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.empName}>{profile?.name}</Text>
            <Text style={styles.companyName}>{profile?.company?.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/(employee)/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
            ) : (
              <User color={Colors.text} size={24} />
            )}
            {unreadNotifications > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      </View>
      {/* Leave Balances / Benefits Summary */}
      <View style={[styles.statsRow, { marginTop: 16, marginBottom: 20 }]}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Annual</Text>
          <Text style={styles.balanceValue}>{balances.annual_balance ?? '-'}</Text>
          <Text style={styles.balanceHelp}>days remaining</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Sick</Text>
          <Text style={styles.balanceValue}>{balances.sick_balance ?? '-'}</Text>
          <Text style={styles.balanceHelp}>days remaining</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Casual</Text>
          <Text style={styles.balanceValue}>{balances.casual_balance ?? '-'}</Text>
          <Text style={styles.balanceHelp}>days remaining</Text>
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsRow}>
        <TouchableOpacity 
          style={styles.statsCard}
          onPress={() => router.push('/(employee)/tasks')}
        >
          <CheckSquare color={Colors.secondary} size={22} />
          <Text style={styles.statsValue}>{myTasksCount}</Text>
          <Text style={styles.statsLabel}>Pending Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statsCard}
          onPress={() => router.push('/(employee)/profile')}
        >
          <User color={Colors.success} size={22} />
          <Text style={styles.statsValue}>{unreadNotifications}</Text>
          <Text style={styles.statsLabel}>Unread Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Announcements Section */}
      <View style={styles.sectionHeaderRow}>
        <Megaphone color={Colors.primary} size={18} />
        <Text style={styles.sectionTitle}>Company Broadcasts</Text>
      </View>

      {announcements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No company announcements at this time.</Text>
        </View>
      ) : (
        announcements.map((ann) => (
          <View key={ann.id} style={styles.annCard}>
            <View style={styles.annHeader}>
              <Text style={styles.annTitle}>{ann.title}</Text>
              <Text style={styles.annDate}>
                {new Date(ann.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <Text style={styles.annContent}>{ann.content}</Text>
          </View>
        ))
      )}

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
  welcomeCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  empName: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  companyName: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  profileButton: {
    backgroundColor: Colors.inputBg,
    borderRadius: 14,
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: 'Outfit',
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  statsValue: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 8,
  },
  statsLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
  },
  balanceValue: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 6,
  },
  balanceHelp: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  emptyText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textMuted,
  },
  annCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  annTitle: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  annDate: {
    fontFamily: 'Outfit',
    fontSize: 11,
    color: Colors.textMuted,
  },
  annContent: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
