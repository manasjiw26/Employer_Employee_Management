import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { useAuth } from '../_layout';
import { Megaphone, Users, Calendar, CheckSquare, Copy, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function EmployerHome() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ employees: 0, activeTasks: 0, pendingLeaves: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const employeeList = await apiFetch('/employees');
      const taskList = await apiFetch('/tasks');
      const pendingLeaveList = await apiFetch('/leaves/pending');
      const announcementsList = await apiFetch('/misc/announcements');

      setStats({
        employees: employeeList.length,
        activeTasks: taskList.filter((t: any) => t.status !== 'DONE').length,
        pendingLeaves: pendingLeaveList.length,
      });

      setAnnouncements(announcementsList);
    } catch (err: any) {
      console.log('Error fetching stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePostAnnouncement = async () => {
    if (!annTitle || !annContent) {
      Alert.alert('Error', 'Please fill in both title and content.');
      return;
    }

    setPosting(true);
    try {
      const newAnn = await apiFetch('/misc/announcements', {
        method: 'POST',
        body: JSON.stringify({ title: annTitle, content: annContent }),
      });
      setAnnouncements([newAnn, ...announcements]);
      setAnnTitle('');
      setAnnContent('');
      Alert.alert('Success', 'Announcement posted successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (profile?.company?.registration_code) {
      Clipboard.setString(profile.company.registration_code);
      Alert.alert('Copied', 'Company registration code copied to clipboard!');
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Card & Registration Code */}
      <View style={styles.companyCard}>
        <View style={styles.companyHeader}>
          <View>
            <Text style={styles.companyLabel}>Welcome Back,</Text>
            <Text style={styles.employerName}>{profile?.name}</Text>
            <Text style={styles.companyName}>{profile?.company?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(employer)/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
            ) : (
              <User color={Colors.text} size={24} />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.codeRow}>
          <View>
            <Text style={styles.codeLabel}>Registration Code for Employees</Text>
            <Text style={styles.codeText}>{profile?.company?.registration_code}</Text>
          </View>
          <TouchableOpacity style={styles.copyButton} onPress={copyCodeToClipboard}>
            <Copy color={Colors.onPrimary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderColor: Colors.secondary }]}>
          <Users color={Colors.secondary} size={24} style={styles.metricIcon} />
          <Text style={styles.metricValue}>{stats.employees}</Text>
          <Text style={styles.metricLabel}>Total Staff</Text>
        </View>
        
        <View style={[styles.metricCard, { borderColor: Colors.primary }]}>
          <CheckSquare color={Colors.primary} size={24} style={styles.metricIcon} />
          <Text style={styles.metricValue}>{stats.activeTasks}</Text>
          <Text style={styles.metricLabel}>Active Tasks</Text>
        </View>

        <View style={[styles.metricCard, { borderColor: Colors.success }]}>
          <Calendar color={Colors.success} size={24} style={styles.metricIcon} />
          <Text style={styles.metricValue}>{stats.pendingLeaves}</Text>
          <Text style={styles.metricLabel}>Pending Leaves</Text>
        </View>
      </View>

      {/* Post Announcement */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Megaphone color={Colors.primary} size={20} />
          <Text style={styles.cardTitle}>Post Company Announcement</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Announcement Title"
          placeholderTextColor={Colors.textMuted}
          value={annTitle}
          onChangeText={setAnnTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your announcement content here..."
          placeholderTextColor={Colors.textMuted}
          value={annContent}
          onChangeText={setAnnContent}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity 
          style={styles.postButton} 
          onPress={handlePostAnnouncement}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.postButtonText}>Broadcast Announcement</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Announcements Feed */}
      <Text style={styles.sectionHeader}>Recent Broadcasts</Text>
      {announcements.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No announcements posted yet.</Text>
        </View>
      ) : (
        announcements.map((ann) => (
          <View key={ann.id} style={styles.announcementItem}>
            <Text style={styles.annTitle}>{ann.title}</Text>
            <Text style={styles.annDate}>
              {new Date(ann.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
  },
  companyLabel: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  employerName: {
    fontFamily: 'Outfit',
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  companyName: {
    fontFamily: 'Outfit',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
  },
  codeText: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.secondary,
    letterSpacing: 2,
    marginTop: 2,
  },
  copyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginHorizontal: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 5,
  },
  metricIcon: {
    marginBottom: 10,
  },
  metricValue: {
    fontFamily: 'Outfit',
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  metricLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 10,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  postButtonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  sectionHeader: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textMuted,
  },
  announcementItem: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  annTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  annDate: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  annContent: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
