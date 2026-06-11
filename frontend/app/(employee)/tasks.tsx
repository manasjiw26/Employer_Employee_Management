import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../../src/theme/colors';
import { apiFetch } from '../../src/config/api';
import { Calendar, Play, Check, CheckSquare } from 'lucide-react-native';
import { useAuth } from '../_layout';
import { mergeTask, readTaskCache, subscribeToTaskChanges, writeTaskCache } from '../../src/cache/taskCache';

export default function EmployeeTasks() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const cacheScope = `employee:${profile?.id || 'unknown'}`;

  const fetchMyTasks = async (syncJira = false) => {
    try {
      setLoading(true);
      const data = (
        await apiFetch(`/tasks/sync${syncJira ? '?force=true' : ''}`, { method: 'POST' })
      ).tasks;
      setTasks(data);
      await writeTaskCache(cacheScope, data);
    } catch (err: any) {
      console.log('Error fetching my tasks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile?.id || !profile?.company_id) return;

    readTaskCache(cacheScope).then(cache => {
      if (cache) setTasks(cache.tasks);
      if (!cache?.isFresh) fetchMyTasks();
      else setLoading(false);
    });

    return subscribeToTaskChanges(
      cacheScope,
      profile.company_id,
      task => task.assigned_to_id === profile.id,
      setTasks,
    );
  }, [profile?.id, profile?.company_id]);

  const handleUpdateStatus = async (taskId: string, newStatus: 'IN_PROGRESS' | 'DONE') => {
    setUpdatingId(taskId);
    try {
      const response = await apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setTasks(prev => {
        const changedTask = response.task || { id: taskId, status: newStatus };
        const next = mergeTask(prev, changedTask);
        writeTaskCache(cacheScope, next);
        return next;
      });

      if (response.sync_warning) {
        Alert.alert('Task Updated', response.sync_warning);
      } else if (newStatus === 'DONE') {
        Alert.alert('Task Completed!', 'Great work. The task has been marked as completed.');
      } else {
        Alert.alert('Task Started', 'Task status updated to In Progress.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update task status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = tasks.filter(task => task.status === statusFilter);

  const renderTaskItem = ({ item }: { item: any }) => {
    const isUpdating = updatingId === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        {item.jira_issue_key ? <Text style={styles.issueKey}>{item.jira_issue_key}</Text> : null}
        {item.description ? <Text style={styles.taskDesc}>{item.description}</Text> : null}

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Calendar color={Colors.textMuted} size={14} />
            <Text style={styles.detailText}>
              Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No due date'}
            </Text>
          </View>
        </View>

        {/* Action buttons based on task state */}
        <View style={styles.actionsBox}>
          {item.status === 'TODO' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn]}
              onPress={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Play color={Colors.onPrimary} size={14} fill={Colors.onPrimary} />
                  <Text style={styles.btnText}>Start Work</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => handleUpdateStatus(item.id, 'DONE')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <Check color={Colors.onPrimary} size={14} />
                  <Text style={styles.btnText}>Complete Task</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'DONE' && (
            <View style={styles.doneBanner}>
              <CheckSquare color={Colors.success} size={16} />
              <Text style={styles.doneText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category Tab Selector */}
      <View style={styles.tabBar}>
        {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.tabButton, statusFilter === status && styles.tabButtonActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.tabText, statusFilter === status && styles.tabTextActive]}>
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
            <Text style={styles.emptyText}>No tasks in this category.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => fetchMyTasks(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.onPrimary,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  taskTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  taskDesc: {
    fontFamily: 'Outfit',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  issueKey: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontFamily: 'Outfit',
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 6,
  },
  actionsBox: {
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
  },
  startBtn: {
    backgroundColor: Colors.secondary,
  },
  completeBtn: {
    backgroundColor: Colors.success,
  },
  btnText: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onPrimary,
    marginLeft: 6,
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.tagGreen,
    borderRadius: 10,
    paddingVertical: 12,
  },
  doneText: {
    fontFamily: 'Outfit',
    fontSize: 13,
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
