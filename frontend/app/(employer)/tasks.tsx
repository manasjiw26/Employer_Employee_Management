import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { CheckSquare, Plus, Calendar, User, X } from 'lucide-react-native';
import { useAuth } from '../_layout';
import { mergeTask, readTaskCache, subscribeToTaskChanges, writeTaskCache } from '../../src/cache/taskCache';

export default function EmployerTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('ALL');

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [jiraAccountId, setJiraAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mappingJira, setMappingJira] = useState(false);

  const cacheScope = `employer:${profile?.id || 'unknown'}`;

  const fetchData = async (syncJira = false) => {
    try {
      setLoading(true);
      const cached = await readTaskCache(cacheScope);
      if (cached) setTasks(cached.tasks);

      const taskList = syncJira
        ? (await apiFetch('/tasks/sync?force=true', { method: 'POST' })).tasks
        : cached?.isFresh
          ? cached.tasks
          : (await apiFetch('/tasks/sync', { method: 'POST' })).tasks;
      const employeeList = await apiFetch('/employees');
      
      setTasks(taskList);
      await writeTaskCache(cacheScope, taskList);
      // Filter out employers from assignments
      setEmployees(employeeList.filter((emp: any) => emp.role === 'EMPLOYEE'));
    } catch (err: any) {
      console.log('Error fetching tasks data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id || !profile?.company_id) return;
    fetchData();

    return subscribeToTaskChanges(
      cacheScope,
      profile.company_id,
      () => true,
      setTasks,
    );
  }, [profile?.id, profile?.company_id]);

  const handleCreateTask = async () => {
    if (!title || !dueDate || !assignedToId) {
      Alert.alert('Error', 'Please fill in Title, Due Date, and select an Assignee.');
      return;
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      Alert.alert('Error', 'Please enter the due date in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        points_reward: 0,
        due_date: parsedDueDate.toISOString(),
        assigned_to_id: assignedToId,
      };

      const newTask = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTasks(prev => {
        const next = mergeTask(prev, newTask);
        writeTaskCache(cacheScope, next);
        return next;
      });
      setCreateModalVisible(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignedToId('');

      Alert.alert(
        newTask.sync_warning ? 'Task Saved' : 'Success',
        newTask.sync_warning || 'Task created and assigned!',
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === assignedToId);

  const handleSaveJiraId = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Select an employee first.');
      return;
    }
    if (!jiraAccountId.trim()) {
      Alert.alert('Error', 'Enter the Jira accountId.');
      return;
    }

    setMappingJira(true);
    try {
      const mapped = await apiFetch(`/employees/${selectedEmployee.id}/jira/map`, {
        method: 'POST',
        body: JSON.stringify({
          accountId: jiraAccountId.trim(),
          displayName: selectedEmployee.name,
        }),
      });

      setEmployees(prev => prev.map(emp =>
        emp.id === selectedEmployee.id ? { ...emp, ...mapped } : emp
      ));
      setJiraAccountId('');
      Alert.alert('Success', 'Jira ID saved. New tasks for this employee can now be created in Jira too.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save Jira ID');
    } finally {
      setMappingJira(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'ALL') return true;
    return task.status === filter;
  });

  const renderTaskItem = ({ item }: { item: any }) => {
    const statusColors = {
      TODO: { bg: Colors.tagBlue, text: Colors.secondary },
      IN_PROGRESS: { bg: Colors.tagOrange, text: Colors.primary },
      DONE: { bg: Colors.tagGreen, text: Colors.success },
    };

    const config = statusColors[item.status as 'TODO' | 'IN_PROGRESS' | 'DONE'] || { bg: Colors.border, text: Colors.textSecondary };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.text }]}>{item.status}</Text>
          </View>
        </View>

        {item.description ? <Text style={styles.taskDesc}>{item.description}</Text> : null}

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Calendar color={Colors.textMuted} size={14} />
            <Text style={styles.detailText}>
              Due: {new Date(item.due_date).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.assigneeRow}>
          <User color={Colors.textSecondary} size={14} />
          <Text style={styles.assigneeLabel}>Assigned to:</Text>
          <Text style={styles.assigneeName}>{item.assignedTo?.name || 'Unknown'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.filterButtonActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status === 'IN_PROGRESS' ? 'IN PROGRESS' : status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No tasks found matching filter.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => fetchData(true)}
      />

      {/* FAB (Floating Action Button) for creating task */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Plus color={Colors.onPrimary} size={24} />
      </TouchableOpacity>

      {/* Create Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign New Task</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <X color={Colors.text} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Finish client presentation"
                  placeholderTextColor={Colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Provide task details here..."
                  placeholderTextColor={Colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-12-31"
                  placeholderTextColor={Colors.textMuted}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign to Employee</Text>
                <View style={styles.dropdownContainer}>
                  {employees.map((emp) => (
                    <TouchableOpacity
                      key={emp.id}
                      style={[
                        styles.assigneeOption,
                        assignedToId === emp.id && styles.assigneeOptionActive,
                      ]}
                      onPress={() => {
                        setAssignedToId(emp.id);
                        setJiraAccountId(emp.jira_account_id || '');
                      }}
                    >
                      <Text
                        style={[
                          styles.assigneeOptionText,
                          assignedToId === emp.id && styles.assigneeOptionTextActive,
                        ]}
                      >
                        {emp.name}{emp.jira_account_id ? ' (Jira mapped)' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {employees.length === 0 && (
                    <Text style={styles.errorText}>No employees available in directory.</Text>
                  )}
                </View>
                {selectedEmployee && !selectedEmployee.jira_account_id ? (
                  <View style={styles.jiraMapBox}>
                    <Text style={styles.jiraMapTitle}>Add Jira ID for {selectedEmployee.name}</Text>
                    <Text style={styles.jiraMapHelp}>
                      Paste the Atlassian accountId to store it in Supabase and create future tasks in Jira.
                    </Text>
                    <TextInput
                      style={styles.jiraInput}
                      placeholder="Jira accountId"
                      placeholderTextColor={Colors.textMuted}
                      value={jiraAccountId}
                      onChangeText={setJiraAccountId}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.jiraSaveButton}
                      onPress={handleSaveJiraId}
                      disabled={mappingJira}
                    >
                      {mappingJira ? (
                        <ActivityIndicator color={Colors.onPrimary} />
                      ) : (
                        <Text style={styles.jiraSaveButtonText}>Save Jira ID</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateTask}
                disabled={submitting || employees.length === 0}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.submitButtonText}>Create & Assign Task</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.onPrimary,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '800',
  },
  taskDesc: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  assigneeLabel: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  assigneeName: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: Colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    padding: 8,
  },
  assigneeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  assigneeOptionActive: {
    backgroundColor: Colors.primary,
  },
  assigneeOptionText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  assigneeOptionTextActive: {
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  errorText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    padding: 10,
  },
  jiraMapBox: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  jiraMapTitle: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  jiraMapHelp: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginTop: 4,
  },
  jiraInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontFamily: 'Outfit',
    fontSize: 13,
    marginTop: 10,
  },
  jiraSaveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  jiraSaveButtonText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
