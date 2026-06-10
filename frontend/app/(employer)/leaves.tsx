import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { Calendar, Check, X, FileText, User } from 'lucide-react-native';

export default function EmployerLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const fetchPendingLeaves = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/leaves/pending');
      setLeaves(data);
    } catch (err: any) {
      console.log('Error fetching leaves:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const handleUpdateStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    const comment = comments[leaveId] || '';

    setSubmitting(prev => ({ ...prev, [leaveId]: true }));
    try {
      await apiFetch(`/leaves/${leaveId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, manager_comment: comment }),
      });

      // Remove the handled leave from the list
      setLeaves(prev => prev.filter(item => item.id !== leaveId));
      Alert.alert('Success', `Leave request ${status.toLowerCase()} successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update leave request');
    } finally {
      setSubmitting(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  const handleCommentChange = (leaveId: string, text: string) => {
    setComments(prev => ({ ...prev, [leaveId]: text }));
  };

  const renderLeaveItem = ({ item }: { item: any }) => {
    const typeLabels = {
      SICK: 'Sick Leave',
      CASUAL: 'Casual Leave',
      ANNUAL: 'Annual Leave',
      UNPAID: 'Unpaid Leave',
    };

    const typeLabel = typeLabels[item.type as 'SICK' | 'CASUAL' | 'ANNUAL' | 'UNPAID'] || item.type;

    return (
      <View style={styles.card}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <User color={Colors.textSecondary} size={20} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.empName}>{item.profile?.name || 'Employee'}</Text>
            <Text style={styles.empEmail}>{item.profile?.email || ''}</Text>
          </View>
        </View>

        {/* Leave Details */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Calendar color={Colors.primary} size={16} />
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{typeLabel}</Text>
          </View>

          <View style={styles.detailRow}>
            <Calendar color={Colors.secondary} size={16} />
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.start_date).toLocaleDateString()} to {new Date(item.end_date).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.reasonRow}>
            <FileText color={Colors.textMuted} size={16} />
            <Text style={styles.reasonLabel}>Reason:</Text>
          </View>
          <Text style={styles.reasonText}>"{item.reason}"</Text>
        </View>

        {/* Comment field */}
        <TextInput
          style={styles.commentInput}
          placeholder="Add a manager comment/feedback..."
          placeholderTextColor={Colors.textMuted}
          value={comments[item.id] || ''}
          onChangeText={(text) => handleCommentChange(item.id, text)}
        />

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
            disabled={submitting[item.id]}
          >
            <X color={Colors.danger} size={16} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleUpdateStatus(item.id, 'APPROVED')}
            disabled={submitting[item.id]}
          >
            <Check color={Colors.success} size={16} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && leaves.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={leaves}
        renderItem={renderLeaveItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending leave requests.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchPendingLeaves}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileInfo: {
    marginLeft: 12,
  },
  empName: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  empEmail: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
  },
  detailsBox: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 6,
    width: 70,
  },
  detailValue: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  reasonLabel: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  reasonText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingLeft: 22,
    lineHeight: 18,
  },
  commentInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 13,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  rejectBtn: {
    backgroundColor: Colors.tagRed,
    borderColor: Colors.danger,
  },
  rejectBtnText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
    marginLeft: 6,
  },
  approveBtn: {
    backgroundColor: Colors.tagGreen,
    borderColor: Colors.success,
  },
  approveBtnText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: 6,
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
});
