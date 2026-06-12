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
  FlatList,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { Calendar, FileText, Send, Info } from 'lucide-react-native';
import DatePicker from '../../src/components/DatePicker';

export default function EmployeeLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [type, setType] = useState<'SICK' | 'CASUAL' | 'ANNUAL' | 'UNPAID'>('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);

  const fetchMyLeaves = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/leaves/my');
      setLeaves(data);
    } catch (err: any) {
      console.log('Error fetching my leaves:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const handleApplyLeave = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in Start Date, End Date, and Reason.');
      return;
    }

    // Basic date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Error', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }
    if (end < start) {
      Alert.alert('Error', 'End Date cannot be before Start Date.');
      return;
    }

    setSubmitting(true);
    try {
      const newLeave = await apiFetch('/leaves', {
        method: 'POST',
        body: JSON.stringify({
          type,
          start_date: startDate,
          end_date: endDate,
          reason,
        }),
      });

      setLeaves([newLeave, ...leaves]);
      Alert.alert('Success', 'Leave application submitted successfully!');
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to apply for leave');
    } finally {
      setSubmitting(false);
    }
  };

  const renderLeaveItem = ({ item }: { item: any }) => {
    const statusConfig = {
      PENDING: { bg: Colors.tagGold, text: Colors.warning },
      APPROVED: { bg: Colors.tagGreen, text: Colors.success },
      REJECTED: { bg: Colors.tagRed, text: Colors.danger },
    };

    const config = statusConfig[item.status as 'PENDING' | 'APPROVED' | 'REJECTED'] || { bg: Colors.border, text: Colors.textSecondary };

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyCardHeader}>
          <Text style={styles.leaveType}>{item.type} Leave</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.leaveDates}>
          {new Date(item.start_date).toLocaleDateString()} to {new Date(item.end_date).toLocaleDateString()}
        </Text>

        <Text style={styles.leaveReason}>Reason: "{item.reason}"</Text>

        {item.manager_comment ? (
          <View style={styles.commentBox}>
            <Info color={Colors.secondary} size={14} />
            <Text style={styles.commentLabel}>Comment:</Text>
            <Text style={styles.commentText}>"{item.manager_comment}"</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Leave Application Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Request Time Off</Text>

        {/* Leave Type Toggle */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Leave Type</Text>
          <View style={styles.typeOptionsRow}>
            {(['SICK', 'CASUAL', 'ANNUAL', 'UNPAID'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.typeButton,
                  type === opt && styles.typeButtonActive
                ]}
                onPress={() => setType(opt)}
              >
                <Text style={[
                  styles.typeButtonText,
                  type === opt && styles.typeButtonTextActive
                ]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dates Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setStartDatePickerVisible(true)}
            >
              <Text style={[
                styles.datePickerTriggerText,
                !startDate && { color: Colors.textMuted }
              ]}>
                {startDate ? startDate : 'Select start date...'}
              </Text>
              <Calendar color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
            <DatePicker
              visible={startDatePickerVisible}
              value={startDate}
              onClose={() => setStartDatePickerVisible(false)}
              onSelectDate={(date) => {
                setStartDate(date);
                setStartDatePickerVisible(false);
              }}
              title="Select Start Date"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setEndDatePickerVisible(true)}
            >
              <Text style={[
                styles.datePickerTriggerText,
                !endDate && { color: Colors.textMuted }
              ]}>
                {endDate ? endDate : 'Select end date...'}
              </Text>
              <Calendar color={Colors.textSecondary} size={16} />
            </TouchableOpacity>
            <DatePicker
              visible={endDatePickerVisible}
              value={endDate}
              onClose={() => setEndDatePickerVisible(false)}
              onSelectDate={(date) => {
                setEndDate(date);
                setEndDatePickerVisible(false);
              }}
              title="Select End Date"
            />
          </View>
        </View>

        {/* Reason */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Reason for Request</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please detail your reason for taking leave..."
            placeholderTextColor={Colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleApplyLeave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <View style={styles.btnContent}>
              <Send color={Colors.onPrimary} size={16} />
              <Text style={styles.submitBtnText}>Submit Leave Request</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Leave Request History */}
      <Text style={styles.sectionHeader}>Leave Applications History</Text>

      {loading && leaves.length === 0 ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : leaves.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>You haven't requested any leaves yet.</Text>
        </View>
      ) : (
        leaves.map((item) => (
          <View key={item.id}>
            {renderLeaveItem({ item })}
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
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  typeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeButton: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: Colors.onPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 14,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerTriggerText: {
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onPrimary,
    marginLeft: 8,
  },
  sectionHeader: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveType: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Outfit',
    fontSize: 10,
    fontWeight: '800',
  },
  leaveDates: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  leaveReason: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    marginLeft: 6,
  },
  commentText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 4,
    flex: 1,
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
